# first time setup
* install [git](https://git-scm.com/downloads/win)
* Install [nvm](https://github.com/coreybutler/nvm-windows)
* run `nvm install 20`
* run `nvm use 20`
* open a cmd and go to some directory
* run `git clone https://github.com/MarcProe/GlamBot.git`
* run `cd GlamBot`
* run `setup.bat` (will create some folders)
* for gmail, create an [app passwort](https://myaccount.google.com/apppasswords)
* copy `example.env` to `.env`
* put intro and outro videos in folder `asset`

# on update
* run `git pull`
* run `npm install`
* review and adjust the configuration options in `.env`
* pay close attention if new config options where added to `example.env`
* start the processes:
  * start processor with `npm run prc` in a separate cmd
  * start webserver with `npm run srv` in a separate cmd
  * start mailer with `npm run sml` in a separate cmd

# operation
* put some file into the configured folder (`E:\video`)
* access the webinterface via `http://localhost:3000`