defmodule Amps.SQS do
  import ExAws
  import ExAws.SQS
  require Logger
  alias Amps.DB

  use GenServer

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  def child_spec(opts) do
    name = opts[:name]

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  def init(args) do
    parms = args[:parms]
    env = args[:env] || ""
    provider = DB.find_by_id("providers", parms["provider"])
    req = cred(provider)
    Process.send_after(self(), {:fetch, parms, req, env}, 0)
    {:ok, parms}
  end

  def handle_info({:fetch, parms, req, env}, state) do
    fetch_messages(parms, req, env)
    {:noreply, state}
  end

  def fetch_messages(parms, req, env) do
    try do
      get_messages(parms, req)
      |> process_messages(parms, req, env)

      send(self(), {:fetch, parms, req, env})
    rescue
      e ->
        Logger.error(Exception.message(e))
        send(self(), {:fetch, parms, req, env})
    end
  end

  def get_messages(parms, req) do
    parms
    |> url(req)
    |> receive_message(wait_time_seconds: parms["wait_time_seconds"])
    |> request!(req)
    |> get_in([:body, :messages])
  end

  def process_messages(messages, parms, req, env) do
    url =
      parms
      |> url(req)

    Enum.each(messages, fn %{body: body, receipt_handle: receipt} ->
      msg = %{
        "data" => body
      }


      event =
        Map.merge(msg, %{
          "service" => parms["name"],
          "msgid" => AmpsUtil.get_id(),
          "ftime" => DateTime.to_iso8601(DateTime.utc_now())
        })

      IO.inspect(event)

      {event, sid} = AmpsEvents.start_session(event, %{"service" => parms["name"]}, env)

      # fname =
      #   if not AmpsUtil.blank?(opts["format"]) do
      #     AmpsUtil.format(opts["format"], event)
      #   else
      #     opts["name"] <> "_" <> AmpsUtil.format("{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}", event)
      #   end

      # event = Map.merge(event, %{"fname" => fname})

      Logger.info("S3 Message Received on queue #{parms["queue_name"]}")

      topic = "amps.svcs.#{parms["name"]}.#{parms["queue_name"]}"

      AmpsEvents.send(event, %{"output" => topic}, %{}, env)

      AmpsEvents.end_session(sid, env)
      delete_message(url, receipt, req)
    end)

    # Send Events
  end

  def delete_message(url, receipt, req) do
    delete_message(url, receipt) |> request!(req)
  end

  def url(parms, req) do
    get_queue_url(parms["queue_name"],
      queue_owner_aws_account_id: parms["owner_id"]
    )
    |> request!(req)
    |> get_in([:body, :queue_url])
  end

  def cred(provider) do
    [
      access_key_id: provider["key"],
      secret_access_key: provider["secret"]
    ]
  end
end
