defmodule Amps.Actions.LDAP do
  require Logger
  alias Amps.DB

  def test do
    parms = %{
      "base" => "cn=users,dc=example,dc=com",
      "scope" => "wholeSubtree",
      "filter" => %{
        "and" => [
          %{
            "or" => [
              %{
                "substrings" => %{
                  "key" => "cn",
                  "matchers" => [
                    %{
                      "matcher" => "initial",
                      "value" => "u"
                    }
                  ]
                }
              },
              %{
                "substrings" => %{
                  "key" => "cn",
                  "matchers" => [
                    %{
                      "matcher" => "final",
                      "value" => "t"
                    }
                  ]
                }
              }
            ]
          },
          %{
            "present" => "uid"
          },
          %{
            "equalityMatch" => %{
              "key" => "uid",
              "value" => "test2"
            }
          }
        ]
      }
    }

    ldap(%{}, parms, "")
  end

  def run(msg, parms, {_state, env}) do
    ldap(msg, parms, env)
  end

  def ldap(msg, parms, _env) do
    provider = DB.find_by_id("providers", parms["provider"])
    IO.inspect(provider)

    case LDAPEx.Client.start_link(
           server: provider["server"],
           port: provider["port"],
           username: provider["username"],
           password: provider["password"],
           ssl: provider["ssl"]
         ) do
      {:ok, ldap} ->
        IO.inspect(ldap)

        Logger.info(
          "Successfully connected to LDAP Server on host #{provider["host"]} and port #{provider["port"]}"
        )

        # LDAPEx.Client.get_object(ldap, parms["base"])
        filter = {:and, filter(parms["filter"])}
        IO.inspect(filter)

        req =
          LDAPEx.Client.setup_search(
            baseObject: parms["base"],
            scope: String.to_atom(parms["scope"]),
            filter: {:and, filter(parms["filter"])},
            sizeLimit: parms["sizeLimit"],
            attributes: parms["attributes"]
          )

        case LDAPEx.Client.search(ldap, req, parms["timeout"] || 15000) do
          {:ok, {results, _}} ->
            res = Jason.encode!(results)
            size = byte_size(res)
            msgid = AmpsUtil.get_id()

            msg =
              if size > 10000 do
                dir = AmpsUtil.tempdir(msgid)
                fpath = Path.join(dir, msgid)
                File.write(fpath, res)

                msg
                |> Map.drop(["data"])
                |> Map.merge(%{
                  "msgid" => msgid,
                  "fpath" => fpath,
                  "fsize" => size,
                  "parent" => msg["msgid"]
                })
              else
                IO.inspect("SMALLER")

                msg
                |> Map.drop(["fpath", "fsize"])
                |> Map.merge(%{
                  "msgid" => msgid,
                  "data" => res,
                  "parent" => msg["msgid"]
                })
              end

            {:send, [msg]}

          {:error, error} ->
            raise error
        end

      {:error, error} ->
        raise error
    end
  end

  def filter(filter, acc \\ []) do
    Enum.reduce(filter, acc, fn res, acc ->
      case res do
        {k, v} ->
          case k do
            "and" ->
              acc ++ [{:and, filter(v, acc)}]

            "or" ->
              acc ++ [{:or, filter(v, acc)}]

            "not" ->
              acc ++ [{:not, filter(v, acc)}]

            "present" ->
              acc ++ [{:present, v}]

            "equalityMatch" ->
              acc ++
                [
                  {:equalityMatch, {:AttributeValueAssertion, v["key"], v["value"]}}
                ]

            "substrings" ->
              acc ++
                [
                  {:substrings,
                   {:SubstringFilter, v["key"],
                    Enum.map(v["matchers"], fn %{
                                                 "matcher" => matcher,
                                                 "value" => value
                                               } ->
                      {String.to_atom(matcher), value}
                    end)}}
                ]

            _ ->
              acc
          end

        obj ->
          filter(obj, acc)
      end
    end)
  end

  def ex do
      {:and,
       [
         {:or,
          [
            {:substrings, {:SubstringFilter, "cn", [{:initial, "u"}]}},
            {:substrings, {:SubstringFilter, "cn", [{:final, "t"}]}}

            # {:present, "uid"}
          ]},
         {:present, "uid"},
         {:equalityMatch, {:AttributeValueAssertion, "uid", "test2"}}
       ]}
  end
end
