
type Nil end
typealias MayBe{T} Union{T,Nil}

type splay 
    data::Int
    left::MayBe{splay}
    right::MayBe{splay}
end

splay( data :: Int) = splay(data, Nil(), Nil() )
root = splay(0)                # splay tree the root is root


function find(node::splay, data)
    global root
    if (data == root.data) || (typeof(node) == Nil)
        return
    end
    if (data == node.data)
        splay!(node)
        return
    end
    (data < node.data ? (typeof(node.left) != Nil ? find(node.left, data) : splay!(node)) :
        (typeof(node.right) != Nil ? find(node.right, data) : splay!(node)) )
end


function delete(key)
    global root
    global debugprint

    if (debugprint == true)
        println("delete ", key)
    end

    find(root, key)

    # left subtree is Nil, right not Nil, left subtree of the right child is Nil
    if (typeof(root.left)==Nil && typeof(root.right)!=Nil && typeof(root.right.left)==Nil) 
        root = root.right
        prn(root)
    end
    
    # symmetric case to above
    if (typeof(root.right)==Nil && typeof(root.left)!=Nil && typeof(root.left.right)==Nil) 
        root = root.left
        prn(root)
    end

    if (root.data == key) && (typeof(root.left)!=Nil)      # left subtree is not Nil
        n = root.left
        while ( typeof(n.right)!=Nil)            # get the max in the left subtree
            n = n.right
        end
        p = findParent(n.data)
        p.right = n.left
        root.data = n.data                
        prn(root)
        return
    end

    if (root.data == key) && (typeof(root.right)!=Nil)      # left subtree is Nil, right is !Nil
        n = root.right
        while ( typeof(n.left)!=Nil)            # get the min in the left subtree
            n = n.left
        end
        p = findParent(n.data)
        p.left = n.right
        root.data = n.data                
        prn(root)
        return
    end
    (root.data == key ? root = Nil : return)        # both subtrees are empty
end


function insert(node::splay, data ) 
    
    if (data < node.data )
        if (typeof(node.left)== Nil) 
            node.left = splay(data, Nil(), Nil() )
            splay!( node.left )                # splay the node
            return
        else
            insert(node.left, data)
        end
    end
    if (data > node.data )
        if (typeof(node.right)== Nil) 
            node.right = splay(data, Nil(), Nil())
            splay!( node.right )                # splay the node
            return
        else
            insert(node.right, data)
        end
    end
    #return node         
end


function splay!( x )  # splay the tree rooted at node, containing the node x
    global root

    global debugprint

    if (debugprint == true)
        println()
        println()
        println("Splay ", x.data)
        println()
        prn(root)
    end

    p = findParent(x.data)
    g = findParent(p.data)


    #println(" p, g ", p.data, " ", g.data)

    if (x.data == root.data)     # x is already at the root
        return 
    end

    if (p.data == g.data) && (p.data != x.data)     # no grandparent    # Simple rotation
        if (x.data < p.data)
            p.left = x.right
            x.right = p
        end
        if (x.data > p.data)
            p.right = x.left
            x.left = p
        end
        root = x
        splay!(x)        # recursively splay x to the top
        # println(root)
        return
    end

    # x has a parent and a grandparent
    # r is the node where the subtree will hang
    r = findParent(g.data)

    if (x.data < p.data < g.data)                        # Zig Zig
        g.left = p.right
        p.left = x.right
        p.right = g
        x.right = p
        if (g.data == root.data)
            root = x
            #println("zero ", root)
        else
            (r.data > x.data? r.left =x : r.right =x)
        end
        splay!(x)        # recursively splay x to the top
        return
    end

    if (x.data > p.data > g.data)                        # Zig Zig
        g.right = p.left
        p.right = x.left
        p.left = g
        x.left = p
        if (g.data == root.data)
            root = x
        else
            (r.data > x.data? r.left =x : r.right =x)
        end
        splay!(x)        # recursively splay x to the top
        return
    end

    if (p.data < x.data < g.data)                        # Zig Zag
        p.right = x.left
        g.left = x.right
        x.left = p
        x.right = g
        if (g.data == root.data)
            root = x
        else
            (r.data > x.data? r.left =x : r.right =x)
        end
        splay!(x)        # recursively splay x to the top
        return
    end

    if (g.data < x.data < p.data)                        # Zig Zag
        p.left = x.right
        g.right = x.left
        x.left = g
        x.right = p
        if (g.data == root.data)
            root = x
        else
            (r.data > x.data? r.left =x : r.right =x)
        end
        splay!(x)        # recursively splay x to the top
        return
    end
end


# Print the tree using in order traversal.
# Large trees with more than 16 nodes will generate 
# a run time error.

prn(node::splay) = ppst(node, 60)

function ppst(node::splay,  right::Int)
    if (typeof(node.left)!=Nil)
        ppst(node.left,  right - 5)
    end
    println( repeat(" ", right-5) * "-----" * string(node.data))
    if (typeof(node.right)!=Nil)
        ppst(node.right,  right - 5)
    end
end


# helper function to find the parent of the node that
# contains the key. We use it to stitch the subtree as a child of
# the parent after a rotation is performed.

function findParent(key)
    node, par = root, root
    while (node.data != key)
        par = node
        if (key < node.data)
            node = node.left
        else
            node = node.right
        end
    end
    return par
end


debugprint = true
for i in 1:5
    insert(root,i)
end


find(root,0)


for i in 0:4
    delete(i)
end


size = 100000
y=zeros(size)

debugprint = false
inp = randperm(size)

using PyPlot
root = splay(0)
ctr = 1
for j in inp 
    y[ctr] = @elapsed    insert(root,j)
    ctr = ctr + 1
end


p = plot( y)

prn(n::splay) = return        # redefine prn() to suppress printing

ctr = size
for j in inp[1:size-1] 
    y[ctr] = @elapsed    delete(j)
    ctr = ctr - 1
end

p= plot( y[2:size])


using BenchmarkTools
root = splay(0)
for j in inp 
    insert(root,j)
end
t = @benchmark (insert(root, 100001), delete(100001))
median(t)

