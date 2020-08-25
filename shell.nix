# Lets setup some definitions
let
    # niv should pin your current thing inside ./nix/sources
    # here we go and get that pinned version so we can pull packages out of it
    sources = import ./nix/sources.nix;
    normalPackages = import sources.nixpkgs {};

    # here we dug and archive using lazamar's tool: https://lazamar.co.uk/nix-versions/?package=ruby&revision=67912138ea79c9690418e3c6fc524c4b06a396ad&channel=nixpkgs-unstable#instructions
    # we only need this archive for ruby
    pinnedPackageForRuby = import (builtins.fetchGit {
        # Descriptive name to make the store path easier to identify
        name = "ruby-2.5.5";
        url = "https://github.com/nixos/nixpkgs-channels/";
        ref = "refs/heads/nixpkgs-unstable";
        rev = "67912138ea79c9690418e3c6fc524c4b06a396ad";
    }) {};
    
# using those definitions
in
    # create a shell
    normalPackages.mkShell {
        
        # inside that shell, make sure to use these packages
        buildInputs = [
            pinnedPackageForRuby.ruby
            normalPackages.nodejs
            # python virtual env (run: python -m venv .venv)
            normalPackages.python37
            normalPackages.opencv4
            normalPackages.python37Packages.setuptools
            normalPackages.python37Packages.pip
            normalPackages.python37Packages.virtualenv
            normalPackages.python37Packages.opencv4
            # basic commandline tools
            normalPackages.ripgrep
            normalPackages.which
            normalPackages.git
            normalPackages.less
            normalPackages.tree
            normalPackages.colorls
            normalPackages.niv
            # show all packages: nix-env -qa -P
            # seach: nix -qA your-package-name
        ];
        
        
        shellHook = ''
        
        # asthetics
        PS1="∫"
        alias ls="ls --color"
        
        #
        # use venv
        #
        ls .venv &>/dev/null || python -m venv .venv
        source .venv/bin/activate
        echo "============================================="
        echo "installing pip modules"
        echo "============================================="
        pip install -r requirements.txt
        # use the project directory
        PYTHONPATH="$PYTHONPATH:$PWD"
        
        #
        # setup local commands
        #
        # add commands to path
        PATH="$PWD/commands:$PATH"
        # ensure commands folder exists
        if [[ -d "./commands" ]]; then
            echo hi;
        else
            mkdir ./commands
        fi
        # create the "commands" command if it doesnt exist
        if [[ -f "./commands/commands" ]]; then
            echo hi;
        else
            echo "#!/usr/bin/env bash
            ls -1 ./commands | sed 's/^/    /'
            " > "./commands/commands"
        fi
        # make sure commands are executable
        chmod -R 777 "./commands"
        # display the commands
        echo ""
        echo ""
        echo "available commands:"
        ls -1 ./commands | sed 's/^/    /'
        alias help="./commands/help" # overrides default bash "help"
        echo ""
        '';
        
        # Environment variables
        # HELLO="world";
        
        # # note the ./. acts like $PWD
        # FOO = toString ./. + "/foobar";
    }
