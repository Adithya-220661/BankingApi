.MODEL SMALL
.STACK 100H

.DATA
array DB 55,32,98,99,13,16,38,25,56,12  ; Array of 10 numbers
largest DB ?                             ; To store the largest number

.CODE
MAIN PROC
    MOV AX, @DATA   ; Initialize data segment
    MOV DS, AX

    MOV BX, 0       ; BX = index (start from 0)
    MOV AL, array[BX]  ; AL = first element
    MOV largest, AL  ; Store first element as largest

COMPARE:
    INC BX         ; Move to the next element
    CMP BX, 10     ; Stop when BX = 10 (out of bounds)
    JE EXIT

    MOV AL, array[BX]  ; AL = current array value
    CMP AL, largest
    JLE CONTINUE  ; If AL is not larger, skip update

    MOV largest, AL  ; Update largest number

CONTINUE:
    JMP COMPARE

EXIT:
    MOV AH, 4CH  ; Exit program
    INT 21H

MAIN ENDP
END MAIN
