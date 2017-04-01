// A helpful list of commands

// Make your gcp project the active project
gcloud config configurations activate globallocation

// Look at your contexts (cluster)
kubectl config get-contexts

// Use a particular contexts
kubectl config use-contexts {context name here}

// Cool tools to clean up docker images
// Stop all containers
docker rm $(docker ps -a -q)

// Remove all intermedate container images
docker rmi $(docker images | grep "^<none>" | awk '{print $3}') --force

// Remove all svcp container images
docker rmi $(docker images | grep "svcp" | awk '{print $3}') --force
