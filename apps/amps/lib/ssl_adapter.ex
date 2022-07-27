# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.SSL do
  @behaviour SiteEncrypt.Adapter
  #alias SiteEncrypt.Adapter

 # @impl Adapter

  def start_link(endpoint) do
    IO.inspect(endpoint)
    SiteEncrypt.Adapter.start_link(__MODULE__, endpoint, endpoint)
  end

  @impl true
  def config(_id, endpoint) do
    IO.inspect(endpoint)

    %{
      certification: endpoint.certification(),
      site_spec: endpoint.child_spec([])
    }
  end

  @impl true
  def http_port(_id, endpoint) do
    http_config = endpoint.config(:http)

    with true <- Keyword.keyword?(http_config),
         port when is_integer(port) <- Keyword.get(http_config, :port) do
      {:ok, port}
    else
      _ ->
        raise "Unable to retrieve HTTP port from the HTTP configuration. SiteEncrypt relies on the Lets Encrypt " <>
                "HTTP-01 challenge type which requires an HTTP version of the endpoint to be running and " <>
                "the configuration received did not include an http port.\n" <>
                "Received: #{inspect(http_config)}"
    end
  end
end
