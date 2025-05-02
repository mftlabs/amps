defmodule ServiceMonitoring do
  require Logger
  alias Amps.DB

  def get_nats_info do
    # host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:nats_addr]
    url = "http://localhost:8222/varz"
    response = HTTPoison.get!(url)
    req = JSON.decode!(response.body)
    # IO.puts(req)
    DB.insert("service_monitoring", %{
      "service_type" => "nats",
      "system_info" => req
    })
  end

  def opensearch_system_info do
    # host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:nats_addr]
    url =
      "http://localhost:9600/_plugins/_performanceanalyzer/metrics?metrics=Latency,CPU_Utilization&agg=avg,max&dim=ShardID&nodes=all"

    response = HTTPoison.get!(url)
    req = JSON.decode!(response.body)
    # IO.puts(req)
    DB.insert("service_monitoring", %{
      "service_type" => "opensearch",
      "system_info" => req
    })
  end

  def get_sys_info() do
    cpu_per_core =
      case :cpu_sup.util([:detailed, :per_cpu]) do
        {:all, 0, 0, []} -> []
        cores -> Enum.map(cores, fn {n, busy, non_b, _} -> {n, Map.new(busy ++ non_b)} end)
      end

    disk =
      case :disksup.get_disk_data() do
        [{~c"none", 0, 0}] ->
          []

        other ->
          Enum.map(other, fn {partition, size, capacity} ->
            %{partion: partition, size: size, capacity: capacity}
          end)
      end
    mdata =  :memsup.get_system_memory_data()
    %{
      cpu_avg1: :cpu_sup.avg1(),
      cpu_avg5: :cpu_sup.avg5(),
      cpu_avg15: :cpu_sup.avg15(),
      cpu_nprocs: :cpu_sup.nprocs(),
      cpu_per_core:
        Enum.reduce(cpu_per_core, %{}, fn {idx, val}, acc ->
          Map.put(acc, idx, val)
        end),
      disk: disk,
      system_mem: mdata
    }

    # DB.insert("service_monitoring", %{
    # "service_type" => "sys_info",
    # "system_info" => data
    # })
  end
end
