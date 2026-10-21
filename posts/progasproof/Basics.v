
(* 
A recursive definition of 1+2+..+n
*)

Require Import Arith.

Fixpoint sum (n:nat) : nat :=
  match n with
  | 0 => 0
  | S m => n + sum m
  end.


Compute (sum 10).

(* Let us first prove the s n = n + s (n-1) *)

Lemma l1: forall n:nat, sum (S n) = (S n) + (sum n).
Proof.  

   induction n as [|m IH]. 

   - (*2*0 = 0 *) simpl. reflexivity.
   - (* 2*sum(n) = 2n + sum(n-1) *) rewrite -> IH. simpl. reflexivity.

Qed.

Lemma l2: forall n:nat, S (S n) = S (n+1).
Proof.
  induction n; intros. simpl.
  reflexivity.

  simpl.
  rewrite  <- IHn.
  reflexivity.
Qed.

Lemma l3: forall n:nat, n+1 = S n.
Proof.
  induction n; intros. simpl.
  reflexivity.

  simpl.
  rewrite  <- IHn.
  reflexivity.
Qed.



Theorem gauss_sum: forall n:nat, 2*(sum n) = n * (S n).
Proof.

   induction n as [|m IH]; intros. simpl.

   - (*2*0 = 0 *) simpl. reflexivity.
   - (* 2*sum(n) = 2n + sum(n-1) *)  
     rewrite -> l1. 

     rewrite mult_plus_distr_l.
     rewrite -> IH.

     replace (S m) with (m+1).
     replace (S (m+1)) with (2+m).

     SearchRewrite(_+_).
     
     rewrite <- mult_plus_distr_r.
     rewrite mult_comm.
     reflexivity.

     intros.

     simpl.
     rewrite  l2.
     reflexivity.

     rewrite l3.
     reflexivity.
Qed.


