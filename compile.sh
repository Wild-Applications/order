docker build -t wildapps/order:0.0.1 . &&
kubectl scale --replicas=0 deployment deployment --namespace=order &&
kubectl scale --replicas=2 deployment deployment --namespace=order
