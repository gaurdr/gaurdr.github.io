
type Nil end
MayBe{T} = Union{T,Nil}

type  bst 
    data::Int
    left::MayBe{bst}
    right::MayBe{bst}
end

global root = Nil()                # root of the BST

function find(node::MayBe{bst}, key::Int)
    if (typeof(node) == Nil)
        return false
    end
    
    if (node.data == key)
            return true
    end
    
    if (key < node.data)
        find(node.left, key)
    else
        find(node.right, key)
    end
    
end

function ins(node::MayBe{bst}, d::Int)           # insert d in the BST rooted at node

   if (typeof(node)==Nil) 
        node = bst(d, Nil(), Nil())              # attach a new BST with data d
        return node
   end
   
   if (d == node.data)
        return node                              # d already in tree, no insertion 
   end
    
   if (d < node.data )                           # check whether insert is in left/right subtree
        node.left = ins(node.left, d)
   else
        node.right = ins(node.right, d)
   end 
   return node                                   #reference needed to reassign the node
    
end

function min(node::MayBe{bst})                 # returns Int, never called on empty BST
    while (typeof(node.left) != Nil)
        node = node.left
    end
    return node.data                            # left most element
end

global root = Nil()
A = [4,2,6,1,3,5,7]
for i=1:length(A)
    root = ins(root,A[i])                           # note the assignment to root, BST updated
    println(root)
end


function del(node::MayBe{bst}, d::Int)
   if (typeof(node)==Nil)
        return node
   end
   
     if ((d == node.data) && (typeof(node.left) == Nil) && (typeof(node.right) == Nil))
        return Nil()                              # node to be deleted is a leaf
    end
    
    if ((d == node.data) && (typeof(node.left) == Nil))   # node to be deleted has one child
        return node.right
    end
    
     if ((d == node.data) && (typeof(node.right) == Nil)) # node to be deleted has one child
        return node.left
    end
    
    
    # node to be deleted has two children
    if ((d == node.data) && (typeof(node.left) != Nil) && (typeof(node.right) != Nil))
          m = min(node.right)            # find the min in the right subtree                    
          node = del(node, m)            # delete it recursively
          node.data = m                  # copy the min to the current node 
          return node
    end
    
    
   if (d < node.data)
        node.left = del(node.left, d)
    else
        node.right = del(node.right, d)
    end
    return node
end


A = [4,2,6,1,3,5,7]
for i=1:length(A)
    root = del(root, A[i])
    println(root)
end


# Plots the time it takes for random insertions and then random deletions 
# insertion is in blue, deletion is in yellow.

using PyPlot

size = 10000
y=zeros(size)

inp = randperm(size)

root =Nil()
ctr = 1
for j in inp 
    y[ctr] = @elapsed    root = ins(root,j)
    ctr = ctr + 1
end


p = plot( y)

ctr = size
for j in inp[1:size-1] 
    y[ctr] = @elapsed    root = del(root,j)
    ctr = ctr - 1
end

p= plot( y)

