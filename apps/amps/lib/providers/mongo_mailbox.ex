defmodule AmpsMailbox do
  alias Amps.DB

  @doc """
  """
  def add_message(recipient, message) do
    newmsg = Map.put(message, "mailbox", recipient)

    case DB.insert("mailbox", newmsg) do
      {:ok, _result} ->
        :ok

      {:error, reason} ->
        val = Exception.message(reason)
        {:error, val}
    end
  end

  def delete_message(mailbox, msgid) do
    result = DB.delete_one("mailbox", %{"mailbox" => mailbox, "msgid" => msgid})

    IO.inspect(result)
    :ok
  end

  def get_message(mailbox, msgid) do
    # Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{msgid: msgid}]})
    DB.find_one("mailbox", %{"mailbox" => mailbox, "msgid" => msgid})
  end

  def stat_fname(mailbox, fname) do
    # Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{fname: fname}]})
    DB.find_one("mailbox", %{"mailbox" => mailbox, "fname" => fname})
  end

  def list_messages(mailbox, limit \\ 100) do
    # Mongo.find(:mongo, "mailbox", %{mailbox: mailbox}, limit: limit, sort: %{time: 1})
    # |> Enum.to_list()
    DB.find("mailbox", %{"mailbox" => mailbox}, %{size: limit, sort: [%{mtime: "asc"}]})
  end
end
