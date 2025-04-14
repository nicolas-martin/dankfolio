# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.make
    pkgs.go
    pkgs.nodejs_20
    pkgs.nodePackages.nodemon
    pkgs.nodePackages."expo-cli"
    ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    extensions = [];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["yarn" "start"];
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        yarn-install = "cd frontend && yarn install";
        preBuild = "cd backend && go build ./cmd/...";
      };
      onStart = {
        backend = ''
          make run
        '';
      };
    };
  };
}
