# Get the SamosaMan code on your Mac

Open **Terminal**. Run each command separately.

## 1 Install Git

Check for Homebrew:

```sh
brew --version
```

If Homebrew is missing, install it from [Homebrew](https://brew.sh/). Complete its **Next steps** instructions. Reopen Terminal.

Install Git:

```sh
brew install git
```


## 2 Download the code

Run these commands:

```sh
mkdir -p ~/Projects
cd ~/Projects
git clone --branch liquidglassrefactor https://github.com/hakeemfuad/samosaman.git
```

Wait for the download to finish.

## 3 Check the download

Open the project folder and check the branch:

```sh
cd samosaman
git branch --show-current
```

The result must be `liquidglassrefactor`.

The project is in `~/Projects/samosaman`. The website files are in its `Website/public` folder.

