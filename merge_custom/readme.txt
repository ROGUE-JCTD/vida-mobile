The content of this folder can be used to replace files in the platforms folder after a clean build. We have clean
build setup to delete the platforms folder so that everything is installed cleanly. If you need to make any
modifications to files in the platforms folder, copy your updated file into this folder in a directory structure that
matches the platforms folder. When you run clean-build.sh, these files will replace the files that are created
by:
ionic platform add <platform name>
ionic plugin add <plugin name>
