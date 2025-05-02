defmodule Amps.Handlers do
  @moduledoc """
  Provides the structure of ExampleStore records for a minimal default of Mnesiac.
  """
  use Mnesiac.Store
  import Record, only: [defrecord: 3]

  @doc """
  Record definition for ExampleStore default record.
  """
  Record.defrecord(
    :handler,
    __MODULE__,
    name: nil,
    messages: %{}
  )

  @typedoc """
  ExampleStore default record field type definitions.
  """
  @type handler ::
          record(
            :handler,
            name: atom(),
            messages: map()
          )

  @impl true
  def store_options,
    do: [
      record_name: :handler,
      attributes: handler() |> handler() |> Keyword.keys(),
      disc_copies: [node()]
    ]

  # def put_pending(id, ctxid) do
  #   {:atomic, res} =
  #     :mnesia.transaction(fn ->
  #       case :mnesia.wread({:responder, id}) do
  #         [] ->
  #           nil

  #         [{:responder, id, pid, node, pending, responses}] ->
  #           pending = [ctxid | pending]
  #           :mnesia.write({:responder, id, pid, node, pending, responses})
  #           {:responder, id, pid, node, pending, responses}
  #       end
  #     end)

  #   res
  # end

  # def delete_pending(id, ctxid) do
  #   {:atomic, res} =
  #     :mnesia.transaction(fn ->
  #       case :mnesia.wread({:responder, id}) do
  #         [] ->
  #           nil

  #         [{:responder, id, pid, node, pending, responses}] ->
  #           pending = List.delete(pending, ctxid)
  #           :mnesia.write({:responder, id, pid, node, pending, responses})
  #           {:responder, id, pid, node, pending, responses}
  #       end
  #     end)

  #   res
  # end

  # def put_response(id, ctxid, response) do
  #   {:atomic, res} =
  #     :mnesia.transaction(fn ->
  #       case :mnesia.wread({:responder, id}) do
  #         [] ->
  #           nil

  #         [{:responder, id, pid, node, pending, responses}] ->
  #           responses = responses ++ [response]
  #           pending = List.delete(pending, ctxid)

  #           :mnesia.write({:responder, id, pid, node, pending, responses})
  #           {:responder, id, pid, node, pending, responses}
  #       end
  #     end)

  #   res
  # end
  def progress(name, message, msgid) do
    case get(name) do
      nil ->
        nil

      messages ->
        if messages[msgid] do
          messages[msgid].in_progress[message.reply_to]
        else
          nil
        end
    end
  end

  def process(name, message, msgid, progress) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            messages =
              if messages[msgid] do
                new = messages[msgid].attempts + 1

                messages
                |> put_in([msgid, :in_progress], %{message.reply_to => progress})
                |> put_in([msgid, :message], message)
                |> put_in([msgid, :attempts], new)
              else
                messages
              end

            :mnesia.write({:handler, name, messages})
            messages[msgid]
        end
      end)

    res
  end

  def stop_process(name, message, msgid) do
    {:atomic, _res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            messages =
              if messages[msgid] do
                {progress, messages} = pop_in(messages, [msgid, :in_progress, message.reply_to])
                Process.exit(progress, :shutdown)
                messages
              else
                messages
              end

            :mnesia.write({:handler, name, messages})
            {:handler, name, messages}
        end
      end)

    :ok
  end

  def add_attempt(name, msgid) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            {messages, new} =
              if messages[msgid] do
                new = messages[msgid].attempts + 1
                {put_in(messages, [msgid, :attempts], new), new}
              else
                {messages, nil}
              end

            :mnesia.write({:handler, name, messages})
            new
        end
      end)

    res
  end

  def attempts(name, msgid) do
    case get_msg(name, msgid) do
      nil ->
        0

      msg ->
        msg.attempts
    end
  end

  def skip(name, msgid) do
    {:atomic, _res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            messages =
              if messages[msgid] do
                put_in(messages, [msgid, :skip], true)
              else
                messages
              end

            :mnesia.write({:handler, name, messages})
            {:handler, name, messages}
        end
      end)


    :ok
  end

  def is_registered(name, msgid) do
    case get(name) do
      nil ->
        nil

      messages ->
        if Map.has_key?(messages, msgid) do
          if messages[msgid].skip do
            :skip
          else
            messages[msgid]
          end
        else
          :new
        end
    end
  end

  def deregister(name, msgid) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            if messages[msgid] do
              Process.exit(messages[msgid].progress, :shutdown)
            end

            messages = Map.drop(messages, [msgid])

            :mnesia.write({:handler, name, messages})
            {:handler, name, messages}
        end
      end)

    res
  end

  def register(name, message, msgid, progress) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            info = %{
              attempts: 1,
              in_progress: %{message.reply_to => progress},
              message: message,
              skip: false
            }

            messages = Map.put(messages, msgid, info)

            :mnesia.write({:handler, name, messages})
            info
        end
      end)

    res
  end

  def delete(name) do
    {:atomic, :ok} = :mnesia.transaction(fn -> :mnesia.delete({:handler, name}) end)
  end

  def update_msg(name, msgid, data) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:handler, name}) do
          [] ->
            nil

          [{:handler, name, messages}] ->
            messages = Map.put(messages, msgid, data)

            :mnesia.write({:handler, name, messages})
            {:handler, name, messages}
        end
      end)

    res
  end

  def get_msg(name, msgid) do
    messages = get(name)

    if messages do
      messages[msgid]
    end
  end

  def put(name) do
    case get(name) do
      nil ->
        {:atomic, :ok} = :mnesia.transaction(fn -> :mnesia.write({:handler, name, %{}}) end)

      _rec ->
        {:atomic, :ok}
    end
  end

  def get(name) do
    with {:atomic, res} <-
           :mnesia.transaction(fn -> :mnesia.read({:handler, name}) end) do
      case res do
        [{:handler, _name, messages}] ->
          messages

        [] ->
          nil
      end
    end
  end
end
