defmodule Amps.Actions.Email do
  import Swoosh
  import Swoosh.Email
  alias Amps.Actions.Email.Mailer

  def run(msg, parms, {state, env}) do
    provider = Amps.DB.find_by_id(AmpsUtil.index(env, "providers"), parms["provider"])
    IO.inspect(provider)
    send(msg, parms, provider, {state, env})
  end

  @spec adapter_config(nil | maybe_improper_list() | map()) :: [
          {:access_key
           | :auth
           | :password
           | :port
           | :region
           | :relay
           | :secret
           | :ssl
           | :tls
           | :tls_options
           | :username, any()},
          ...
        ]
  def adapter_config(provider) do
    case provider["etype"] do
      "SMTP" ->
        [
          relay: provider["relay"],
          username: provider["username"],
          password: provider["password"],
          ssl: provider["ssl"],
          tls: String.to_atom(provider["tls"]),
          auth: String.to_atom(provider["auth"]),
          port: provider["port"],
          tls_options:
            [
              versions: [:"tlsv1.2"]
            ] ++ :tls_certificate_check.options(provider["relay"])
        ]

      "AmazonSES" ->
        [
          region: provider["region"],
          access_key: provider["access_key"],
          secret: provider["secret"]
        ]

      _ ->
        raise("Unsupported Email Type")
    end
  end

  def send(msg, parms, provider, {state, env}) do
    email =
      new()
      |> to(
        AmpsUtil.format(parms["to"], msg)
        |> String.split(",")
        |> Enum.filter(fn e -> e != "" end)
      )
      |> cc(
        AmpsUtil.format(parms["cc"], msg)
        |> String.split(",")
        |> Enum.filter(fn e -> e != "" end)
      )
      |> bcc(
        AmpsUtil.format(parms["bcc"], msg)
        |> String.split(",")
        |> Enum.filter(fn e -> e != "" end)
      )
      |> from({AmpsUtil.format(parms["from_name"], msg), AmpsUtil.format(parms["from"], msg)})
      |> subject(AmpsUtil.format(parms["subject"], msg))
      |> html_body(AmpsUtil.format(parms["body"], msg))

    email =
      if parms["attach"] do
        email
        |> attachment(
          Swoosh.Attachment.new(msg["fpath"], filename: AmpsUtil.format(parms["fname"], msg))
        )
      else
        email
      end

    config = adapter_config(provider)

    # IO.inspect(config)

    case :"Elixir.Swoosh.Adapters.#{provider["etype"]}".deliver(email, config) do
      {:ok, result} ->
        if parms["confirm"] do
          AmpsEvents.send(
            msg,
            %{"output" => parms["output"]},
            state,
            env
          )

          {:ok, result}
        end
    end
  end

  defmodule Mailer do
    use Swoosh.Mailer, otp_app: :amps
  end
end
