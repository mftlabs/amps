import zipfile
import json
import os


def run(input):
    output = dict()
    input = json.loads(input)
    msg = input["msg"]
    parms = input["parms"]
    try:
        outputdir = msg["fpath"] + ".tmp"

        zf = zipfile.ZipFile(msg["fpath"], mode='r')

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

        output["status"] = "success"
        output["files"] = files
    except Exception as e:
        output["status"] = "error"
        output["message"] = str(e)
    return output
