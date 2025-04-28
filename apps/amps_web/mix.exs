defmodule AmpsWeb.MixProject do
  use Mix.Project

  def project do
    [
      app: :amps_web,
      version: "0.1.1",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.17",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: [:gettext] ++ Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {AmpsWeb.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(:dev), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix, "~> 1.6.6"},
      {:phoenix_html, "~> 3.0"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 0.17.5"},
      {:ecto, "~> 3.12.5"},
      {:floki, ">= 0.30.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.6.2"},
      {:esbuild, "~> 0.2", runtime: Mix.env() == :dev},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:argon2_elixir, "~> 3.0"},
      {:gettext, "~> 0.26.2"},
      {:amps, in_umbrella: true},
      {:jason, "~> 1.2"},
      {:plug_cowboy, "~> 2.5"},
      {:libvault, "~> 0.2.3"},
      {:mongodb_driver, "~> 0.7"},
      {:ex_aws_s3, "~> 2.3.1"},
      {:glob, "~> 1.0"},
      {:httpoison, "~> 1.8"},
      #      {:postgrex, "~> 0.15.10"},
      {:pow, "~> 1.0.25"},
      {:pow_assent, "~> 0.4.12"},
      {:redirect, "~> 0.3.0"},
      {:sweet_xml, "~> 0.7.0"},
      {:temp, "~> 0.4"},
      {:timex, "~> 3.0"},
      {:tesla, git: "https://github.com/teamon/tesla", override: true},
      {:gnat, "~> 1.5.2"},
      {:x509, "~> 0.8.10"},
      {:elixlsx, "~> 0.5.1"},
      {:xlsxir, "~> 1.6.4"},
      {:earmark, "~> 1.4"},
      {:erlport,
       [
         env: :prod,
         override: true,
         git: "https://github.com/erlport/erlport.git",
         branch: "master"
       ]},
      {:swoosh, "~> 1.3"},
      {:file_type, "~> 0.1.0"},
      {:amps_mongodb, [git: "https://github.com/mftlabs/amps-mongodb", branch: "main"]},
      {:unplug, "~> 1.0.0"}

      # {:uuid, "~> 1.1"}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["cmd --cd assets npm install"],
      "assets.deploy": ["cmd --cd assets node build.js --deploy", "phx.digest"]
    ]
  end
end
