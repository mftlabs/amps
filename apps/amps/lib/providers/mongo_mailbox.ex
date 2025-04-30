defmodule AmpsMailbox do
  alias Amps.DB
  require Logger

  @doc """
  """
  def add_message(recipient, message, env \\ "") do
    newmsg = Map.put(message, "mailbox", recipient)

    case DB.insert(AmpsUtil.index(env, "mailbox"), newmsg) do
      {:ok, _result} ->
        :ok

      {:error, reason} ->
        val = Exception.message(reason)
        {:error, val}
    end
  end

  def delete_by_name(user, mailbox, fname, env \\ "") do
    result =
      DB.delete_one(AmpsUtil.index(env, "mailbox"), %{
        "recipient" => user,
        "mailbox" => mailbox,
        "fname" => fname
      })

    :ok
  end

  def delete_message(user, mailbox, msgid, env \\ "") do
    IO.inspect(user)
    IO.inspect(mailbox)
    IO.inspect(msgid)
    IO.inspect(env)

    result =
      DB.delete_one(AmpsUtil.index(env, "mailbox"), %{
        "recipient" => user,
        "mailbox" => mailbox,
        "msgid" => msgid
      })

    IO.inspect(result)

    :ok
  end

  def get_message_by_name(user, mailbox, fname, env \\ "") do
    # Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{msgid: msgid}]})
    DB.find_one(AmpsUtil.index(env, "mailbox"), %{
      "recipient" => user,
      "mailbox" => mailbox,
      "fname" => fname
    })
  end

  def get_message(user, mailbox, msgid, env \\ "") do
    # Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{msgid: msgid}]})
    DB.find_one(AmpsUtil.index(env, "mailbox"), %{
      "recipient" => user,
      "mailbox" => mailbox,
      "msgid" => msgid
    })
  end

  def create_mailbox(user, mailbox, env \\ "") do
    index = AmpsUtil.index(env, "users")
    IO.inspect(user)

    user =
      DB.find_one(index, %{
        "username" => user
      })

    mailboxes = user["mailboxes"]

    case Enum.find(mailboxes, fn mb -> mb["name"] == mailbox end) do
      nil ->
        name = user["firstname"] <> " " <> user["lastname"]

        DB.add_to_field(
          index,
          %{
            "name" => mailbox,
            "desc" => mailbox,
            "createdBy" => name,
            "modifiedBy" => name,
            "created" => AmpsUtil.gettime(),
            "modified" => AmpsUtil.gettime()
          },
          user["_id"],
          "mailboxes"
        )

        {:ok, "Created"}

      mailbox ->
        {:error, "Exists"}
    end
  end

  def delete_mailbox(user, mailbox, env \\ "") do
    index = AmpsUtil.index(env, "users")
    IO.inspect(user)

    user =
      DB.find_one(index, %{
        "username" => user
      })

    mailboxes = user["mailboxes"]

    case Enum.find(mailboxes, fn mb -> mb["name"] == mailbox end) do
      nil ->
        {:error, "Mailbox not found"}

      mailbox ->
        DB.delete_from_field(index, mailbox, user["_id"], "mailboxes", mailbox["_id"])
        {:ok, "Deleted"}
    end
  end

  def get_mailboxes(user, env \\ "") do
    user =
      DB.find_one(AmpsUtil.index(env, "users"), %{
        "username" => user
      })

    case user do
      nil ->
        []

      user ->
        user["mailboxes"]
    end
  end

  def is_mailbox(user, mailbox, env \\ "") do
    if mailbox == "default" do
      "default"
    else
      user =
        DB.find_one(AmpsUtil.index(env, "users"), %{
          "username" => user
        })

      case user do
        nil ->
          nil

        user ->
          exists =
            Enum.find(user["mailboxes"], fn mbox ->
              mbox["name"] == mailbox
            end)

          if exists do
            exists["name"]
          else
            nil
          end
      end
    end
  end

  def stat_fname(user, mailbox, fname, env \\ "") do
    # Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{fname: fname}]})
    DB.find_one(AmpsUtil.index(env, "mailbox"), %{
      "mailbox" => mailbox,
      "recipient" => user,
      "fname" => fname
    })
  end

  def overwrite(user, mailbox, msg, overwrite, env \\ "") do
    fname = msg["fname"]

    case stat_fname(user, mailbox, fname, env) do
      nil ->
        {msg, fn -> nil end}

      to_delete ->
        if overwrite do
          {msg,
           fn ->
             Logger.info("Overwriting #{to_delete["msgid"]} in Mailbox #{mailbox}")
             delete_message(user, mailbox, to_delete["msgid"], env)
           end}
        else
          {Map.put(msg, "fname", fname <> "(" <> msg["msgid"] <> ")"), fn -> nil end}
        end
    end
  end

  def list_messages(user, mailbox, limit \\ 100, env \\ "") do
    # Mongo.find(:mongo, "mailbox", %{mailbox: mailbox}, limit: limit, sort: %{time: 1})
    # |> Enum.to_list()
    DB.find(AmpsUtil.index(env, "mailbox"), %{"recipient" => user, "mailbox" => mailbox}, %{
      limit: limit,
      sort: %{"mtime" => -1}
    })
  end
end
