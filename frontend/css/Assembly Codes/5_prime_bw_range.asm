.MODEL SMALL
.STACK 100H

.DATA
    start_num DB 10          ; Start of range
    end_num   DB 50          ; End of range
    primes    DB 20 DUP(?)   ; Array to store prime numbers (max 20)
    prime_count DB 0         ; Counter for number of primes

.CODE
MAIN PROC
    MOV AX, @DATA    ; Initialize data segment
    MOV DS, AX       

    MOV CL, start_num ; Load start number into CL

FIND_PRIMES:
    CMP CL, end_num   ; Check if CL exceeds end_num
    JA DONE           ; If yes, exit loop

    CALL IS_PRIME     ; Check if CL is prime
    CMP AL, 1         ; If AL = 1, it's prime
    JNE NEXT_NUM      ; If not prime, skip storing

    ; Store prime number in primes array
    MOV SI, OFFSET prime_count  ; Get address of prime_count
    MOV DL, [SI]                ; Load prime count value
    MOV DH, 0                   ; Ensure DX is properly set
    MOV BX, OFFSET primes       ; Get base address of primes array
    ADD BX, DX                  ; Compute address to store prime
    MOV [BX], CL                ; Store the prime number
    INC BYTE PTR [SI]           ; Increment prime_count

NEXT_NUM:
    INC CL           ; Move to next number
    JMP FIND_PRIMES  ; Repeat for next number

DONE:
    MOV AH, 4CH      ; Exit program
    INT 21H
MAIN ENDP

; --- Subroutine to check if a number is prime ---
IS_PRIME PROC
    MOV AL, CL       ; Copy number to AL
    CMP AL, 2        ; If number is 2, it's prime
    JE PRIME_FOUND
    CMP AL, 1        ; If number is 1, it's not prime
    JBE NOT_PRIME

    MOV BL, 2        ; Start dividing from 2

CHECK_LOOP:
    MOV AH, 0        ; Clear AH before division
    DIV BL           ; AL / BL ? Quotient in AL, remainder in AH
    CMP AH, 0        ; If remainder is 0, it's not prime
    JE NOT_PRIME

    INC BL           ; Increase divisor
    MOV AH, 0
    MOV AL, CL       ; Reload AL to prevent corruption
    DIV BL           ; Check division again
    CMP BL, AL       ; If BL reaches AL, it's prime
    JB CHECK_LOOP    ; Continue looping

PRIME_FOUND:
    MOV AL, 1        ; Set AL = 1 (Prime)
    RET

NOT_PRIME:
    MOV AL, 0        ; Set AL = 0 (Not Prime)
    RET
IS_PRIME ENDP

END MAIN
