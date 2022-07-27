# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.Mailer do
  use Swoosh.Mailer,
    otp_app: :amps,
    adapter: Swoosh.Adapters.SMTP,
    relay: "smtp.gmail.com",
    username: "abhaykram12@gmail.com",
    password: "njuahuwxjkmlscsx",
    tls: :always,
    auth: :always,
    port: 587
end
