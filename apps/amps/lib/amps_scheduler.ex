import Crontab.CronExpression

defmodule Amps.Scheduler do
  use Quantum, otp_app: :amps
  alias AmpsWeb.DB
  require Logger

  def init(config) do
    IO.puts("Scheduler Config")
    IO.inspect(config)

    sched = DB.find("scheduler")

    jobs =
      Enum.reduce(sched, [], fn job, acc ->
        qj = get_job_config(job)

        [qj | acc]
      end)

    config = Keyword.put(config, :jobs, jobs)
    IO.inspect(config)
    config
  end

  def load(name) do
    case DB.find_one("scheduler", %{name: name}) do
      nil ->
        Logger.info("Could not load")

      job ->
        add_job(get_job_config(job))
    end
  end

  def update(job) do
    delete_job(String.to_atom(job["name"]))
    load(job["name"])
  end

  defp get_job_config(job) do
    pieces = %Quantum.Job{
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
        AmpsEvents.send(job["meta"], %{"output" => job["topic"]}, %{})
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
