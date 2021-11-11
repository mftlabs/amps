defmodule WorkflowHandler do
  require Logger

  def run(message, mqstate) do
    msg = Poison.decode!(message)

    if msg != [] do
      AmpsEvents.message(msg)
    end

    sid = AmpsUtil.get_id()
    msg = Map.put(msg, "session", sid)
    session = %{"session_id" => sid, "source" => "workflow"}
    AmpsEvents.session_start(session)

    try do
      parms = msg["rule"]
      itinerary = parms["itinerary"]
      state = run_workflow(msg, itinerary, mqstate)
      AmpsEvents.session_end(sid, state[:status], state["reason"])

      if state[:status] == :retry do
        raise state["reason"]
      else
        state[:status]
      end
    rescue
      error ->
        Logger.info("workflow failed #{inspect(error)}")
        AmpsEvents.session_end(sid, "retry", error)
        raise error
    end
  end

  defp run_workflow(msg, itinerary, mqstate) do
    state = %{:input => [msg], :output => [], :session => msg[:session], :status => :started}
    nstate = run_step(msg, itinerary, state)

    if nstate[:status] == :completed or nstate[:status] == :delivered do
      register_output(msg, nstate[:output], mqstate)
      nstate
    else
      nstate
    end
  end

  def run_step(_msg, [], wfstate) do
    # done
    if wfstate[:status] == :started do
      Map.put(wfstate, :status, :completed)
    else
      wfstate
    end
  end

  def run_step(msg, [step | tail], wfstate) do
    Logger.info("step #{inspect(step)}")
    parms = :maps.get("parms", step)

    AmpsEvents.session_info(:workflow, msg["session"], %{
      :text => "running action: #{step["action"]}"
    })

    files = assess_files(parms, wfstate)

    case run_action(msg, parms, files) do
      {:ok, pystate} ->
        status = pystate["status"] || :failed
        reason = pystate["reason"] || "unknown reason"

        if status == "failed" || status == "retry" do
          Map.merge(wfstate, %{status: status, reason: reason})
        else
          output = pystate["output"] || []
          newlist = List.flatten([output | wfstate["input"]])
          wfstate = Map.put(wfstate, "input", newlist)
          run_step(msg, tail, wfstate)
        end

      {:error, reason} ->
        raise reason
    end
  end

  defp run_action(msg, parms, files) do
    case parms["type"] do
      "python" ->
        Amps.PyService.call(msg, parms)

      _ ->
        # do better checking to see if module exists
        apply(String.to_atom("Elixir." <> parms["module"]), :run, [msg, parms, files])
    end
  end

  defp register_output(msg, [], _mqstate) do
    dirname = AmpsUtil.tempdir(msg["session"])
    AmpsUtil.rmdir(dirname)
  end

  defp register_output(msg, [head | tail], mqstate) do
    rq = mqstate[:opts][:qregister]
    AmpsQueue.enqueue(rq, head)
    register_output(msg, tail, mqstate)
  end

  def assess_files(action, state) do
    case action[:file_select] do
      :current ->
        [List.last(state[:input])]

      :original ->
        [orig | _files] = state[:input]
        [orig]

      :all ->
        [_orig | files] = state[:input]
        files
    end
  end
end
