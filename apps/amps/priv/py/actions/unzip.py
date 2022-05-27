import zipfile
import json
import os
import io
from erlport.erlang import cast, call
from erlport.erlterms import Atom


def run(input):
    output = dict()
    input = json.loads(input)
    msg = input["msg"]
    parms = input["parms"]
    env = input["env"]
    outputdir = msg["fpath"] + ".tmp"

    fpath = call(Atom(b'Elixir.AmpsUtil'), Atom(b'get_local_file'),
                 [json.dumps(msg), bytes(env, "utf-8")])
    print(fpath)
    if not fpath:
        raise "Couldn't fetch message."
    else:
        fpath = fpath.decode("utf-8")

    zf = zipfile.ZipFile(fpath, mode='r')
    try:

        if "password" in parms:
            pwd = parms["password"]
        else:
            pwd = None
        files = []
        namelist = zf.namelist()
        for i in range(len(namelist)):

            name = namelist[i]
            dir = name.endswith("/")
            mac = name.startswith('__MACOSX/')
            ds = ".DS_Store" in name
            if not dir and not mac and not ds:
                if pwd:
                    zf.extract(name, outputdir, str.encode(pwd))
                else:
                    zf.extract(name, outputdir)
                files.append(os.path.join(outputdir, name))
            if i == parms["maxfiles"]:
                break
        zf.close()

        output["status"] = "success"
        output["files"] = files
    except Exception as e:
        zf.close()
        output["status"] = "error"
        output["message"] = str(e)
    return output
