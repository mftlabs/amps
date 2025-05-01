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
      extra_applications: [:logger, :runtime_tools]
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
      {:amps_mongodb, [git: "https://github.com/mftlabs/amps-mongodb", branch: "main"]},
      {:phoenix_pubsub, "~> 2.0"},
      {:swoosh, "~> 1.3"},
      {:plug_cowboy, "~> 2.0"},
      {:uuid, "~> 2.0", hex: :uuid_erl},
      {:export, "~> 0.1.1"},
      {:erlport, "~>0.11.0"},
      {:libvault, "~> 0.2.3"},
      {:poolboy, "~> 1.5"},
      {:glob, "~> 1.0"},
      {:sftp_client, "~> 1.4"},
 #     {:jetstream, git: "https://github.com/aram0112/jetstream"},
      {:jetstream, "~> 0.0.9"},
      {:pythra, git: "https://github.com/mftlabs/pythra", branch: "master"},
      {:gnat, "~> 1.5.2"},
      {:httpoison, "~> 1.8"},
      {:zstream, "~> 0.6.0"},
      {:pow, "~> 1.0.25"},
      {:ex_aws, "~> 2.0"},
      {:ex_aws_s3, "~> 2.0"},
      {:ex_aws_sqs, "~> 3.3"},
      {:quantum, "~> 3.0"},
      {:argon2_elixir, "~> 3.0"},
      {:master_proxy, git: "https://github.com/mftlabs/master_proxy.git"},
      {:site_encrypt, git: "https://github.com/sasa1977/site_encrypt.git", branch: "master"},
      {:tesla, git: "https://github.com/teamon/tesla", override: true},
      {
        :datapio_cluster,
        github: "datapio/opencore", ref: "main", sparse: "apps/datapio_cluster"
      },
      {:mnesiac, git: "https://github.com/aram0112/mnesiac"},
      {:cors_plug, "~> 2.0"},
      {:gen_smtp, "~> 1.0"},
      {:absinthe, "~> 1.7.9"},
      {:ldap_ex, "~> 0.2.2"},
      {:timex, "~> 3.7.8"},
      {:ssl_verify_fun, "~> 1.1.7"}
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
