defmodule Amps.CowboySupervisor do
  use Supervisor

  def start_link(endpoint_opts) do
    Supervisor.start_link(__MODULE__, endpoint_opts, name: Keyword.get(endpoint_opts, :ref))
  end

  def init(endpoint_opts) do
    IO.inspect("ENDPOINT OPTS")
    IO.inspect(endpoint_opts)
    http_opts = Keyword.get(endpoint_opts, :http, [])
    https_opts = Keyword.get(endpoint_opts, :https, nil)
    opts = Keyword.get(endpoint_opts, :opts)

    contents =
      quote do
        use Amps.Endpoint,
            unquote([endpoint_opts[:plug], Macro.escape(opts), endpoint_opts[:ref]])
      end

    {_, mod, bin, _} = Module.create(endpoint_opts[:ref], contents, Macro.Env.location(__ENV__))

    http_child =
      Supervisor.child_spec(
        {Plug.Cowboy, scheme: :http, plug: {mod, endpoint_opts}, options: http_opts},
        restart: :transient
      )

    children = [http_child]

    children =
      if https_opts do
        https_opts = Keyword.merge(https_opts, SiteEncrypt.https_keys(endpoint_opts[:ref]))

        IO.inspect(https_opts)

        https_child =
          Supervisor.child_spec(
            {Plug.Cowboy, scheme: :https, plug: {mod, endpoint_opts}, options: https_opts},
            restart: :transient
          )

        IO.inspect(https_child)

        [http_child, https_child]
      else
        children
      end

    Supervisor.init(children, strategy: :one_for_one)
  end
end
