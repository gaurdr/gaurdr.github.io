
 athird  n
      | mod n 2 == 1 = "0"
      | otherwise = "1"

 addc :: Char - Char - String - (String, String)
 addc '0' '0' "0" = ("0","0")
 addc '0' '1' "0" = ("1","0")
 addc '1' '0' "0" = ("1","0")
 addc '1' '1' "0" = ("0","1")
 addc '0' '0' "1" = ("1","0")
 addc '0' '1' "1" = ("0","1")
 addc '1' '0' "1" = ("0","1")
 addc '1' '1' "1" = ("1","1")

 add :: String - String - String - String
 add [] [] c = c
 add a b c    -- length of a is at most the length of b    
    | length(a)  length(b) = add b a c
     | otherwise =     (add (take n an) (take n b) c1) ++ r
     where 
         (r,c1) = addc (last an) (last b) c
         an =  ['0' | x <- [1..d]]  ++ a
         d = (length b) - (length a)
         n = (length b) -1 

 mult :: String - String - Integer - String
 mult a "0" d = ['0' | x <- [1..length(a)]]++['0' | x <- [1..d]]
 mult a "1" d = a ++ ['0' | x <- [1..d]]
 mult a b cnt = dropWhile (\x - x == '0') $ 
   add (mult a [(last b)] (cnt)) (mult a (take ((length b)-1) b) (cnt+1)) "0"

-- mult "10110" "10110" 0

 guess :: String - Int - String    -- returns new guess
 guess x n 
     | length(x) = n = x
     | length(mult g g 0) < 2*length(g) = guess g n
     | otherwise = guess (x ++ "0") n
       where g = x ++ "1"


-- guess "1" 20

