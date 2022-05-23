import Crontab.CronExpression

defmodule Amps.Scheduler do
  use Quantum, otp_app: :amps
  alias Amps.DB
  require Logger

  def init(config) do
    sched = DB.find("jobs")

    jobs =
      Enum.reduce(sched, [], fn job, acc ->
        qj = get_job_config(job)

        [qj | acc]
      end)

    config = Keyword.put(config, :jobs, config[:jobs] ++ jobs)
    IO.inspect(config)
    config
  end

  def load(name) do
    case DB.find_one("jobs", %{name: name}) do
      nil ->
        Logger.info("Could not load")

      job ->
        add_job(get_job_config(job))
    end
  end

  def update(name) do
    delete_job(String.to_atom(name))
    load(name)
  end

  defp get_job_config(job) do
    _pieces = %Quantum.Job{
      name: String.to_atom(job["name"]),
      overlap: true,
      run_strategy: %Quantum.RunStrategy.Random{nodes: :cluster},
      schedule: ~e[#{get_schedule(job)}]e,
      state:
        if job["active"] do
          :active
        else
          :inactive
        end,
      task: fn ->
        msg =
          Map.merge(
            %{"msgid" => AmpsUtil.get_id(), "action" => "Job: " <> job["name"] <> "Execution"},
            job["meta"]
          )

        {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "Job: " <> job["name"]}, "")

        AmpsEvents.send(
          msg,
          %{"output" => job["topic"]},
          %{}
        )

        AmpsEvents.end_session(sid, "")
      end,
      timezone: :utc
    }
  end

  defp get_schedule(job) do
    pieces =
      case job["type"] do
        "timer" ->
          pieces = ["0", "0", "0", "*", "*", "*"]
          val = "*/" <> job["value"]

          pieces =
            case job["unit"] do
              "Hours" ->
                pieces
                |> List.replace_at(2, val)

              "Minutes" ->
                pieces
                |> List.replace_at(2, "*")
                |> List.replace_at(1, val)

              "Seconds" ->
                pieces
                |> List.replace_at(2, "*")
                |> List.replace_at(1, "*")
                |> List.replace_at(0, val)
            end

        _ ->
          pieces = ["*", "*", "*", "*", "*", "*"]
          [hour, min] = String.split(job["time"], ":")

          pieces =
            pieces
            |> List.replace_at(1, min)
            |> List.replace_at(2, hour)

          if job["type"] == "daily" do
            if job["daily"] do
              pieces
            else
              pieces |> List.replace_at(5, Enum.join(job["weekdays"], ","))
            end
          else
            pieces |> List.replace_at(3, Enum.join(job["days"], ","))
          end
      end

    IO.inspect(pieces)

    Enum.join(pieces, " ")
  end
end
