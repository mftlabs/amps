defmodule AmpsMailbox do
  @doc """
  """
  def add_message(recipient, message) do
    newmsg = Map.put(message, "mailbox", recipient)

    case Mongo.insert_one(:mongo, "mailbox", newmsg) do
      {:ok, _result} ->
        :ok

      {:error, reason} ->
        val = Exception.message(reason)
        {:error, val}
    end
  end

  def delete_message(mailbox, msgid) do
    result =
      Mongo.delete_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{msgid: msgid}]})

    IO.inspect(result)
    :ok
  end

  def get_message(mailbox, msgid) do
    Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{msgid: msgid}]})
  end

  def stat_fname(mailbox, fname) do
    Mongo.find_one(:mongo, "mailbox", %{"$and" => [%{mailbox: mailbox}, %{fname: fname}]})
  end

  def list_messages(mailbox, limit \\ 100) do
    Mongo.find(:mongo, "mailbox", %{mailbox: mailbox}, limit: limit, sort: %{time: 1})
    |> Enum.to_list()
  end
end
