{application,nkeys,
             [{modules,['Elixir.NKEYS','Elixir.NKEYS.CRC',
                        'Elixir.NKEYS.Keypair','Elixir.NKEYS.Xkeys']},
              {optional_applications,[]},
              {applications,[kernel,stdlib,elixir,logger,ed25519,kcl]},
              {description,"Support for nkey generation, parsing, and signing"},
              {registered,[]},
              {vsn,"0.3.0"}]}.
