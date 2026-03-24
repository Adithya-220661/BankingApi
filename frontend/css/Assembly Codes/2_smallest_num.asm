.MODEL SMALL
.STACK 100H

.DATA
array DB 55,32,98,21,13,16,38,25,56,12  ; Array of 10 numbers
smallest DB ?                            ; Variable to store the smallest number

.CODE
MAIN PROC
    MOV AX, @DATA   ; Initialize data segment
    MOV DS, AX

    MOV BX, 0       ; BX = index (start from 0)
    MOV AL, array[BX]  ; AL = first element
    MOV smallest, AL  ; Assume first element is the smallest

COMPARE:
    INC BX          ; Move to the next element
    CMP BX, 10      ; Stop when BX = 10 (out of bounds)
    JE EXIT

    MOV AL, array[BX]  ; AL = current array value
    CMP AL, smallest
    JGE CONTINUE   ; If AL is not smaller, skip update

    MOV smallest, AL  ; Update smallest number

CONTINUE:
    JMP COMPARE

EXIT:
    MOV AH, 4CH  ; Exit program
    INT 21H

MAIN ENDP
END MAIN
