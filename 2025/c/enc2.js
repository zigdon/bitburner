/*
  Encryption II: Vigenère Cipher
  Vigenère cipher is a type of polyalphabetic substitution. It uses  the Vigenère
  square to encrypt and decrypt plaintext with a keyword.
  
  Vigenère square:
            A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 
          +----------------------------------------------------
        A | A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 
        B | B C D E F G H I J K L M N O P Q R S T U V W X Y Z A 
        C | C D E F G H I J K L M N O P Q R S T U V W X Y Z A B
        D | D E F G H I J K L M N O P Q R S T U V W X Y Z A B C
        E | E F G H I J K L M N O P Q R S T U V W X Y Z A B C D
                  ...
        Y | Y Z A B C D E F G H I J K L M N O P Q R S T U V W X
        Z | Z A B C D E F G H I J K L M N O P Q R S T U V W X Y
  
  For encryption each letter of the plaintext is paired with the corresponding
  letter of a repeating keyword. For example, the plaintext DASHBOARD is
  encrypted with the keyword LINUX:
      Plaintext: DASHBOARD
      Keyword:   LINUXLINU
  So, the first letter D is paired with the first letter of the key L. Therefore,
  row D and column L of the  Vigenère square are used to get the first cipher
  letter O. This must be repeated for the whole ciphertext.
  
  You are given an array with two elements:
    ["ARRAYMOUSEMACROFLASHLINUX", "INTEGER"]
  The first element is the plaintext, the second element is the keyword.
  
  Return the ciphertext as uppercase string.

*/

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.ramOverride(16.9)
  var types = new Map([
    ["Encryption II: Vigenère Cipher", solve],
  ])
  return await init(ns, types, undefined, false)
}

async function solve(ns, data) {
  return vigenere(ns, data[0], data[1])
}

/**
 * @param {NS} ns
 * @param {String} plain
 * @param {String} salt
 * @return String
 */
function vigenere(ns, plain, salt) {
  var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  var code = Array(alpha.length).fill(
    Array.from(alpha)
  ).map(
    (l, i) => [...l.slice(i), ...l.slice(0, i)]
  )

  while (salt.length < plain.length) {
    salt += salt
  }

  var res = Array.from(plain).map((c, i) => code[alpha.indexOf(c)][alpha.indexOf(salt[i])])
  return res.join("")
}
