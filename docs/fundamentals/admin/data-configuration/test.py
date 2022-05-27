import os
dir_path = os.path.dirname(os.path.realpath(__file__))
file1 = open(os.path.join(dir_path, 'table.txt'), 'r')
Lines = file1.readlines()

count = 0

string = ""
print("| Field       | Description |\n|-------------|-------------|")
# Strips the newline character
for line in Lines:
    line = line.strip().replace("|", "\|")
    if count % 2 == 0:
        string = "| " + line
    else:
        string += "           | " + line + "          |"
        print(string)
    count += 1
