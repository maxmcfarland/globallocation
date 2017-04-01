//----------------------------------------------------------
//    These are the instructions for setting up a federated
// version of the simplelocation nodejs website.
// Following along from:
//  https://medium.com/google-cloud/planet-scale-microservices-with-cluster-federation-and-global-load-balancing-on-kubernetes-and-a8e7ef5efa5e
//----------------------------------------------------------

          GOOGLE PROJECT:   svcp-globallocation-2/globallocation


// Build the Docker container
// Note: the -t names the image.  The svcp-simplelocation part must match the gcloud project name you are using
docker build -t gcr.io/svcp-globallocation-2/globallocation .

// Test that it works locally (localhost:3000)
docker run -p 3000:3000 gcr.io/svcp-globallocation-2/globallocation

// Next - Push the container to GCloud
gcloud docker -- push gcr.io/svcp-globallocation-2/globallocation


// First - we need to set up DNS
// So, we first will create a MANAGED DNS ZONE
gcloud dns managed-zones create globallocation-dnszone --description "Global Location Federated DNS Zone" --dns-name infra.smartvisioncloudcomputing.com

// Next - lets create 5 clusters
gcloud container clusters create us-west-cluster --zone us-west1-b --scopes cloud-platform --num-nodes 3 --enable-cloud-logging --enable-autoupgrade --enable-autorepair
gcloud container clusters create us-east-cluster --zone us-east1-b --scopes cloud-platform --num-nodes 3 --enable-cloud-logging --enable-autoupgrade --enable-autorepair
gcloud container clusters create china-cluster --zone asia-east1-b --scopes cloud-platform --num-nodes 3 --enable-cloud-logging --enable-autoupgrade --enable-autorepair
gcloud container clusters create japan-cluster --zone asia-northeast1-b --scopes cloud-platform --num-nodes 3 --enable-cloud-logging --enable-autoupgrade --enable-autorepair
gcloud container clusters create europe-cluster --zone europe-west1-b --scopes cloud-platform --num-nodes 3 --enable-cloud-logging --enable-autoupgrade --enable-autorepair

// Get the credentials for this cluster
gcloud container clusters get-credentials us-west-cluster --zone us-west1-b
gcloud container clusters get-credentials us-east-cluster --zone us-east1-b
gcloud container clusters get-credentials china-cluster --zone asia-east1-b
gcloud container clusters get-credentials japan-cluster --zone asia-northeast1-b
gcloud container clusters get-credentials europe-cluster --zone europe-west1-b

// We should now have a small cluster running on the west coast and east coast

// Get kubectl contexts:
kubectl config get-contexts

// You can switch your kubectl context by:
kubectl config use-context gke_svcp-globallocation_us-east1-b_east-cluster or to the west coast one   

// Lets create our federated control pane.
// NOTE:  Make sure you have the . at the end - or it won't work.
// We will run the control pane on the west-coast cluster, and point it to our dns-zone
kubefed init federated-globallocation --host-cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster --dns-zone-name=infra.smartvisioncloudcomputing.com.

// At this point, the federation control plane will deploy. Give it a minute or two to fully deploy.
// This command will create a “virtual” context called "federated-globallocation”. When you use the "federated-globallocation" context, you are addressing all the federated clusters.

// Next we will add both cluster to the federated context
// First the west coast
kubefed --context federated-globallocation join us-west-cluster --cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster --host-cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster

// Then the east coast
 kubefed --context federated-globallocation join us-east-cluster --cluster-context gke_svcp-globallocation-2_us-east1-b_us-east-cluster --host-cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster

 // Then europe
kubefed --context federated-globallocation join europe-cluster --cluster-context gke_svcp-globallocation-2_europe-west1-b_europe-cluster --host-cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster

 // Then japan
 kubefed --context federated-globallocation join japan-cluster --cluster-context gke_svcp-globallocation-2_asia-northeast1-b_japan-cluster --host-cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster

 // Then china
kubefed --context federated-globallocation join china-cluster --cluster-context gke_svcp-globallocation-2_asia-east1-b_china-cluster --host-cluster-context gke_svcp-globallocation-2_us-west1-b_us-west-cluster

// You can check the kfed context:
kubectl --context federated-globallocation get clusters

//--------------------------------------------------------
// Next - create an config map
//--------------------------------------------------------
kubectl --context federated-globallocation apply -f kubedns-config.yaml

// Now, we need a global ip address for our global entry point
gcloud compute addresses create globallocation-ipaddress --global

//--------------------------------------------------------
//   Test a deployment to make sure we can talk to a cluster
//
//--------------------------------------------------------


//--------------------------------------------------------
// Next - create an deployment, and scale it up.
// USE FILE? ::  kubectl --context federated-globallocation create -f kubectl-deployment.yaml
//--------------------------------------------------------
kubectl --context federated-globallocation create deployment globallocation-deployment --image gcr.io/svcp-globallocation/globallocation && kubectl --context federated-globallocation scale deployment globallocation-deployment --replicas 10

//--------------------------------------------------------
// NOTE: I think I need to expose a port after deploying
//--------------------------------------------------------
# Create a service for an deployment, which serves on port 80 and connects to the containers on port 3000.
kubectl --context federated-globallocation expose deployment globallocation-deployment --port=80 --target-port=3000

// We can see them running with
kubectl --context federated-globallocation get deployments

// --------------------------------------------------
// You might be used to exposing a service using a LoadBalancer, but that will create a load balancer
// in each datacenter with its own IP address, which we don’t want. Instead, the NodePort directly
// exposes the service on all the VMs in the cluster (in this case on port 30036, but you can choose
// any valid port). The ingress load balancer will then route traffic to this port on the VMs.
//-------------------------------------------------

// Now create a service the exposes the deployments
kubectl --context federated-globallocation create service nodeport globallocation-svc --tcp=80:3000 --node-port=30036

// Final step is to create the ingress point.
// Create a firewall rule first
gcloud compute firewall-rules create federated-globallocation-ingress-firewall-rule --source-ranges 130.211.0.0/22 --allow tcp:30036 --network default

// And finally create the ingress point
kubectl --context federated-globallocation create -f kubectl-ingress.yaml
