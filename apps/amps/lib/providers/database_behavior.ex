# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Database.Behaviour do
  @callback insert(collection :: String.t(), body:: map) :: :ok | {:error, any}
  @callback insert_with_id(collection :: String.t(), body:: map, id :: String.t()) :: :ok | {:error, any}
  @callback update(collection :: String.t(), body:: map, id :: String.t()) :: :ok | {:error, any}
  @callback delete(collection :: String.t(), clauses :: map) :: :ok | {:error, any}
  @callback delete_by_id(collection :: String.t(), id :: String.t()) :: :ok | {:error, any}
  @callback delete_one(collection :: String.t(), clauses :: map) :: :ok | {:error, any}

  @callback add_to_field(collection :: String.t(), body:: map, id :: String.t(), field :: String.t()) :: :ok | {:error, any}
  @callback add_to_field_with_id(collection :: String.t(), body:: map, id :: String.t(), field :: String.t(), fieldid :: String.t()) :: :ok | {:error, any}
  @callback update_in_field(collection :: String.t(), body:: map, id :: String.t(), field :: String.t(), idx :: String.t()) :: :ok | {:error, any}
  @callback delete_from_field(collection :: String.t(), body:: map, id :: String.t(), field :: String.t(), idx :: String.t()) :: :ok | {:error, any}

  @callback find_one(collection :: String.t(), clauses :: map, opts :: list) :: any | {:error, any}
  @callback find_one_and_update(collection :: String.t(), clauses :: map, body:: map) :: :ok | {:error, any}
  @callback find(collection :: String.t(), clauses :: map, opts :: map) :: any | {:error, any}
  @callback find_by_id(collection :: String.t(), id :: String.t(), opts :: list) :: any | {:error, any}

  @callback get_rows(collection :: String.t(), queryParms :: map, filter :: any) :: any | {:error, any}
  @callback get_in_field(collection :: String.t(), id :: String.t(), field :: String.t(), idx :: String.t()) :: any | {:error, any}

  @callback bulk_insert(doc :: list) :: any | {:error, any}
  @callback bulk_perform(ops :: list, index :: String.t()) :: :ok | {:error, any}

  @callback delete_index(index :: String.t()) :: :ok | {:error, any}

  @callback aggregate_field(collection :: String.t(), field :: String.t()) :: result :: any | {:error, any}
  @callback get_page()  :: {:ok, any} | {:error, any}


    # mongo  def convert_id(clauses) do
    # mongo?  def delete_index(collection) do

end

defmodule Event.Behaviour do
  @callback store(String.t) :: :ok | :error
end

defmodule Auth.Behaviour do
  @callback store(String.t) :: :ok | :error
end

defmodule Archive.Behaviour do
  @callback store(String.t) :: :ok | :error
end

defmodule Mailbox.Behaviour do
  @callback add_mbx_message(mailbox :: String.t(), message :: map) :: {:ok, String.t()} | {:error, any}
  @callback delete_mbx_message(mailbox :: String.t(), messageid :: String.t()) :: :ok | {:error, any}
  @callback get_mbx_message(mailbox :: String.t(), messageid :: String.t()) :: {:ok, map} | {:error, any}
  @callback stat_mbx_filename(mailbox :: String.t(), fname :: String.t()) :: {:ok, map} | {:error, any}
  @callback list_mbx_messages(mailbox :: String.t(), limit :: integer) :: {:ok, list} |  {:error, any}

#  @callback create_mbx(mailbox :: String.t())  :: :ok | {:error, any}
#  @callback delete_mbx(mailbox :: String.t())  :: :ok | {:error, any}
#  @callback get_mbx_names(ser :: String.t()) :: {:ok, list} |  {:error, any}

  # def add_message(recipient, message, env \\ "") do
  # def delete_message(user, mailbox, msgid, env \\ "") do
  #  def get_message(user, mailbox, msgid, env \\ "") do
  # def create_mailbox(user, mailbox, env \\ "") do
  # def delete_mailbox(user, mailbox, env \\ "") do
  #  def get_mailboxes(user, env \\ "") do
  #  def stat_fname(user, mailbox, fname, env \\ "") do
  #  def list_messages(user, mailbox, limit \\ 100, env \\ "") do
end
