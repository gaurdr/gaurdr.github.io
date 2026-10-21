
function model() 
	#global cnf = "(!1 || 2) &&(!2 || 3) &&(!3 || 4) &&(!4 || 5) &&(!5 || 1)"
	#global vars = ["1","2","3","4","5"]
	global cnf = "(!1 || 2) &&(!2 || 3) &&(!3 || 1) && (1||!2) &&(2 || !3) && (3 || !1)"
	global vars = ["1","2","3"]
	#global cnf = "1 && (!(1 && 2) || 3) && (!1 || 4)"
	#global vars = ["1","2","3","4"]
	global ub = 1
	#gc()
	ans = false
	while (ub < length(vars))
		ans=solve(vars, cnf, 0)
		if (ans == true)
			return true
		end
		ub = ub+1
	end
	return false
end


function solve(vars, cnf, val)
	println(" ub=" , ub, " value=", val, " ", cnf)
	#vars = shuffle(vars)
	global ub
	if (ub > val) 
		if (vars == [])
			if ((eval(parse(cnf)) == true) && (val > 0))        # atleast one literal is T
				#println(" ub " , ub, " value ", val, " wff ", cnf)
				ub = val
				return true
			end
			return false
			#return eval(parse(cnf))
		end

		v = vars[1]
		#println(" ub " , ub, " value ", val, " wff ", cnf)
		p1 = solve(vars[2:end], replace(cnf, v , "true"), val+1)
		if (p1 == true)
			return true
		end
		p2 = solve(vars[2:end], replace(cnf, v , "false"), val)
		return p2
	end
end
		
