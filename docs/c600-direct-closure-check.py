import itertools, numpy as np
phi=(1+5**.5)/2
V=[]
for i in range(4):
    for s in (1,-1):
        v=[0]*4; v[i]=s; V.append(v)
for s in itertools.product((.5,-.5),repeat=4): V.append(list(s))
base=[phi/2,.5,1/(2*phi),0]
def even_perms(n):
    for p in itertools.permutations(range(n)):
        inv=sum(1 for i in range(n) for j in range(i+1,n) if p[i]>p[j])
        if inv%2==0: yield p
for p in even_perms(4):
    for sg in itertools.product((1,-1),repeat=3):
        v=[0]*4; b=[base[0]*sg[0],base[1]*sg[1],base[2]*sg[2],0]
        for k in range(4): v[p[k]]=b[k]
        V.append(v)
V=np.unique(np.round(np.array(V,float),9),axis=0); print('vertices',len(V))
e=1/phi
D=np.linalg.norm(V[:,None]-V[None],axis=2); A=np.abs(D-e)<1e-6
cells=set()
for i in range(len(V)):
    nb=np.where(A[i])[0]
    for a,b,c in itertools.combinations(nb,3):
        if A[a,b] and A[a,c] and A[b,c]: cells.add(tuple(sorted((i,a,b,c))))
cells=list(cells); print('cells',len(cells))
# --- 1. grow by face reflections from ONE seed cell (the RCP method) ---
seed=V[list(cells[0])]
def reflect(P,face):
    # reflect through hyperplane containing origin and the 3 face points
    M=face; u,s,vt=np.linalg.svd(M); n=vt[-1]  # normal orthogonal to the 3 points
    return P-2*np.outer(P@n,n)
key=lambda P:tuple(sorted(tuple(np.round(p,6)) for p in P))
seen={key(seed):seed}; frontier=[seed]
while frontier:
    nxt=[]
    for P in frontier:
        for f in itertools.combinations(range(4),3):
            Q=reflect(P,P[list(f)]); k=key(Q)
            if k not in seen: seen[k]=Q; nxt.append(Q)
    frontier=nxt
print('grown by face reflection from one regular tetrahedron:',len(seen),'cells (600 = closes)')
# --- 2. seed-cell-first perspective projection ---
c=seed.mean(0); c/=np.linalg.norm(c)
# rotation taking c to w-axis (Householder)
w=np.array([0,0,0,1.]); u=c-w; H=np.eye(4)-2*np.outer(u,u)/(u@u)
Vr=V@H.T
d=Vr[:,3].max()*1.8
proj=lambda P:P[:,:3]/(d-P[:,3:4])
def spread(P):
    ls=[np.linalg.norm(P[i]-P[j]) for i,j in itertools.combinations(range(4),2)]; return max(ls)/min(ls)
cellsR=[Vr[list(cl)] for cl in cells]
seedR=(seed@H.T); print('seed cell edge-length spread after projection (1.000 = perfectly regular):',round(spread(proj(seedR)),6))
# shells by angular distance of cell centre from seed centre
ang=[np.degrees(np.arccos(np.clip((P.mean(0)/np.linalg.norm(P.mean(0)))@w,-1,1))) for P in cellsR]
groups={}
for P,a in zip(cellsR,ang): groups.setdefault(round(a,1),[]).append(spread(proj(P)))
for a in sorted(groups)[:6]: print(f'  cells at {a:5.1f} deg from seed: {len(groups[a]):3d}, worst edge spread {max(groups[a]):.3f}')
# --- 3. icosahedra: 20 cells around a vertex; their outer faces form a regular icosahedron? ---
v0=0; around=[cl for cl in cells if v0 in cl]; print('cells around one vertex:',len(around))
outer=np.unique(np.array([V[j] for cl in around for j in cl if j!=v0]),axis=0)
dd=np.linalg.norm(outer[:,None]-outer[None],axis=2); print('outer vertices',len(outer),' each with',int((np.abs(dd-e)<1e-6).sum(1)[0]),'neighbours at edge length -> regular icosahedron' )
print('icosahedron centre-to-vertex / edge in flat 3D =',round(np.sin(2*np.pi/5),4),' (a flat icosahedron of 20 REGULAR tets would need 1.0)')
