defmodule Amps.MixProject do
  use Mix.Project

  def project do
    [
      app: :amps,
      version: "0.1.0",
      build_path: "./_build",
      config_path: "./config/config.exs",
      deps_path: "./deps",
      lockfile: "./mix.lock",
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
      {:amps_mongodb, [git: "https://github.com/mftlabs/amps-mongodb", branch: "standalone"]},
      #      {:amps_kafka, [git: "https://github.com/mftlabs/amps_kafka", branch: "main"]},
      {:phoenix_pubsub, "~> 2.0"},
      {:swoosh, "~> 1.3"},
      {:plug_cowboy, "~> 2.0"},
      {:uuid, "~> 2.0", hex: :uuid_erl},
      {:poison, "~> 3.1"},
      {:export, "~> 0.0.7"},
      {:erlport,
       [
         env: :prod,
         override: true,
         git: "https://github.com/erlport/erlport.git",
         branch: "master"
       ]},
      {:poolboy, "~> 1.5"},
      {:glob, "~> 1.0"},
      {:sftp_client, "~> 1.4"},
      {:jetstream, git: "https://github.com/aram0112/jetstream"},
      {:pythra, git: "https://github.com/aram0112/pythra.git"},
      {:gnat, "~> 1.5.2"},
      {:httpoison, "~> 1.8"},
      {:zstream, "~> 0.6.0"},
      {:ex_aws, "~> 2.0"},
      {:ex_aws_s3, "~> 2.0"},
      {:ex_aws_sqs, "~> 3.3"},
      {:quantum, "~> 3.0"},
      {:argon2_elixir, "~> 3.0"},
      {:master_proxy, git: "https://github.com/mftlabs/master_proxy.git"},
      {:tesla, git: "https://github.com/teamon/tesla", override: true},
      {
        :datapio_cluster,
        github: "datapio/opencore", ref: "main", sparse: "apps/datapio_cluster"
      },
      {:mnesiac, git: "https://github.com/aram0112/mnesiac"},
      {:cors_plug, "~> 2.0"},
      {:gen_smtp, "~> 1.0"},
      {:absinthe, "~> 1.7.0"},
      {:ldap_ex, "~> 0.2.2"},
      {:timex, "~> 3.7.8"},
      {:amps_core,
       [git: "https://github.com/mftlabs/amps-core", branch: "separation_test", override: true]}
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
