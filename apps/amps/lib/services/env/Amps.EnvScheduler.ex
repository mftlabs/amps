import Crontab.CronExpression

defmodule Amps.EnvScheduler do
  use Quantum, otp_app: :amps
  alias Amps.DB
  require Logger

  def init(config) do
    config =
      Enum.reduce(config, [], fn {key, val}, acc ->
        str = Atom.to_string(key)

        if String.ends_with?(str, "_name") do
          mod = namespace(val, config[:env])

          [{key, mod} | acc]
        else
          [{key, val} | acc]
        end
      end)

    sched = DB.find(AmpsUtil.index(config[:env], "jobs"))

    jobs =
      Enum.reduce(sched, [], fn job, acc ->
        qj = get_job_config(job, config[:env])

        [qj | acc]
      end)

    config = Keyword.put(config, :jobs, jobs)
    config
  end

  def namespace(atom, env) do
    Atom.to_string(atom)
    |> String.split(".")
    |> List.insert_at(2, String.capitalize(env))
    |> Enum.join(".")
    |> String.to_atom()
  end

  def load(name, env) do
    case DB.find_one(AmpsUtil.index(env, "jobs"), %{name: name}) do
      nil ->
        Logger.info("Could not load job #{name} in environment #{env}")

      job ->
        add_job(namespace(Amps.EnvScheduler.JobBroadcaster, env), get_job_config(job, env))
    end
  end

  def update(name, env) do
    delete_job(namespace(Amps.EnvScheduler.JobBroadcaster, env), String.to_atom(name))
    load(name, env)
  end

  def delete(name, env) do
    delete_job(namespace(Amps.EnvScheduler.JobBroadcaster, env), String.to_atom(name))
  end

  def list(env) do
    jobs(namespace(Amps.EnvScheduler.JobBroadcaster, env))
  end

  defp get_job_config(job, env) do
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
            %{
              "msgid" => AmpsUtil.get_id(),
              "service" => "Job: " <> job["name"],
              "user" => "amps",
              "action" => "Job: " <> job["name"]
            },
            job["meta"]
          )

        {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "Job: " <> job["name"]}, env)

        AmpsEvents.send(
          msg,
          %{"output" => job["topic"]},
          %{},
          env
        )

        AmpsEvents.end_session(sid, env)
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

    Enum.join(pieces, " ")
  end
end
