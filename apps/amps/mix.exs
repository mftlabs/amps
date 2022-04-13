defmodule Amps.MixProject do
  use Mix.Project

  def project do
    [
      app: :amps,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.12",
      elixirc_paths: elixirc_paths(Mix.env()),
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
      mod: {Amps.Application, []},
      extra_applications: [:logger, :runtime_tools, :datapio_cluster]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix_pubsub, "~> 2.0"},
      {:swoosh, "~> 1.3"},
      {:plug_cowboy, "~> 2.0"},
      {:uuid, "~> 2.0", hex: :uuid_erl},
      {:sched_ex, "~> 1.0"},
      {:poison, "~> 3.1"},
      {:mongodb_driver, "~> 0.7"},
      {:export, "~> 0.0.7"},
      {:erlport, "~> 0.10.1"},
      {:poolboy, "~> 1.5"},
      {:glob, "~> 1.0"},
      {:sftp_client, "~> 1.4"},
      {:snap, git: "https://github.com/aram0112/snap"},
      {:jetstream, path: "./jetstream"},
      {:gnat, "~> 1.4"},
      {:ldap_ex, "~> 0.2.2"},
      {:httpoison, "~> 1.8"},
      {:zstream, "~> 0.6.0"},
      {:elsa, "~> 1.0.0-rc.3"},
      {:ex_aws, "~> 2.0"},
      {:ex_aws_s3, "~> 2.0"},
      {:quantum, "~> 3.0"},
      {:argon2_elixir, "~> 2.0"},
      {:tesla, git: "https://github.com/teamon/tesla", override: true},
      {
        :datapio_cluster,
        github: "datapio/opencore", ref: "main", sparse: "apps/datapio_cluster"
      },
      {:mnesiac, git: "https://github.com/aram0112/mnesiac"},
      {:kafka_ex, git: "https://github.com/aram0112/kafka_ex"},
      {:cors_plug, "~> 2.0"}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get"]
    ]
  end
end
