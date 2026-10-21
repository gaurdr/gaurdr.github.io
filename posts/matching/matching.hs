import Data.Map as Map
import Data.List.Split
import Data.List
import Data.Maybe
import System.Random

type A = Int
type B = Int
type Graph = Map A [B]
type Matching = Map B A

nbhrs :: A -> [B]    -- random list of edges
nbhrs k = 
      take k $ randomRs (11,20) (mkStdGen 1024) :: [B]  

g :: Graph        -- random graph
g = fromList $ [(x, nub y) | x <- [1..10], y <- nbhrList]
      where nbhrList = chunksOf 5 (nbhrs 50)

m :: Matching        -- empty matching
m = fromList []

extendb :: Graph ->  Matching -> [Int] -> [[Int]]
extendb g m (b : p)              -- last vertex added was in B
   | e == Nothing = [[]]        -- is a deadend
   | otherwise = [[fromJust e] ++ (b:p)]    -- extend the path
       where e = Map.lookup b m

extenda :: Graph ->  Matching -> [Int] -> [[Int]]
extenda g m (a : p)              -- last vertex added was in A
   | es == Nothing = [[]]        -- deadend
   | otherwise =  [ y | y <- res, length (nub y) == length y] 
        where es = Map.lookup a g 
               -- list of neighbhours of a
                 res = [ [x] ++ (a:p) | x <- fromJust es, Map.member x m == False] 


augPath :: Graph -> Matching -> [[Int]] -> [Int]
augPath g m []  = []
augPath g m (p:ps)
       |  p == []  = []
       | (mod (length p) 2) == 0 && Map.lookup (p!!0) m == Nothing = p
       | mod (length p) 2 == 1 = augPath g m ( ps ++ (extenda g m p) )
       | mod (length p) 2 == 0 = augPath g m ( ps ++ (extendb g m p) )
       -- new candidates are added to the end of the list 

matching :: Graph -> Matching -> Matching
matching g m 
   | augmenting == [] = m
   | otherwise = matching g augMatch
     where 
       augmenting = augPath g m us         
       augnotMedges = chunksOf 2 augmenting
       augMedges = chunksOf 2 $ take ((length augmenting)-1) 
                  $ drop 1 augmenting
       augMMap = fromList [(y, x) | [x,y] <- augMedges]
       augnotMMap = fromList [(x,y) | [x,y] <- augnotMedges]
       augMatch = Map.union (difference m augMMap) augnotMMap
       unsat =  (keys g) Data.List.\\ (elems m)
       us =  [[x] | x <- unsat]    -- list of M-unsaturated vertices

r :: Matching
r =  matching g m
