.MODEL SMALL
.STACK 100H

.DATA
    num1 DW 36      ; First number
    num2 DW 60      ; Second number
    gcd_result DW ? ; Store GCD result
    newline DB 0Dh, 0Ah, '$'  ; Newline for output formatting

.CODE
MAIN PROC
    MOV AX, @DATA   ; Initialize data segment
    MOV DS, AX

    MOV AX, num1    ; Load first number into AX
    MOV BX, num2    ; Load second number into BX

    CALL GCD        ; Call GCD subroutine
    MOV gcd_result, AX  ; Store GCD result

    CALL PRINT_RESULT   ; Print the GCD result

    MOV AH, 4CH   ; Exit program
    INT 21H

MAIN ENDP

;----------------------------------------
; Subroutine to Find GCD using Euclidean Algorithm
; Input: AX = num1, BX = num2
; Output: AX = GCD(num1, num2)
;----------------------------------------
GCD PROC
GCD_LOOP:
    CMP BX, 0      ; If BX is 0, GCD is in AX
    JE GCD_DONE

    MOV DX, 0      ; Clear DX before division
    DIV BX         ; AX / BX, Quotient in AX, Remainder in DX
    MOV AX, BX     ; Move BX to AX
    MOV BX, DX     ; Move remainder to BX
    JMP GCD_LOOP   ; Repeat until remainder is 0

GCD_DONE:
    RET
GCD ENDP

;----------------------------------------
; Subroutine to Print GCD Result
; AX contains the GCD value
;----------------------------------------
PRINT_RESULT PROC
    MOV AX, gcd_result   ; Load GCD result into AX
    CALL PRINT_NUM       ; Call number printing routine

    MOV DX, OFFSET newline  ; Print newline
    MOV AH, 09H
    INT 21H

    RET
PRINT_RESULT ENDP

;----------------------------------------
; Subroutine to Print a Number
; AX - Number to Print
;----------------------------------------
PRINT_NUM PROC
    MOV CX, 0          ; Count of digits
    MOV BX, 10         ; Divisor for extracting digits

PUSH_DIGITS:
    MOV DX, 0          ; Clear DX before division
    DIV BX             ; AX / 10, Quotient in AX, Remainder in DX
    PUSH DX            ; Push remainder (digit) onto stack
    INC CX             ; Increase digit count
    CMP AX, 0          ; Check if quotient is 0
    JNE PUSH_DIGITS    ; If not, continue dividing

PRINT_LOOP:
    POP DX             ; Pop digit from stack
    ADD DL, 30H        ; Convert to ASCII
    MOV AH, 02H
    INT 21H            ; Print digit

    LOOP PRINT_LOOP    ; Repeat for all digits

    RET
PRINT_NUM ENDP

END MAIN
