.MODEL SMALL
.STACK 100H
.DATA
    arr DB 5,2,9,0,1  ; Unsorted array
    len EQU $ - arr       ; Length of array

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, len       ; Outer loop count (n)
OUTER_LOOP:
    DEC CX            ; Reduce loop count
    JZ DONE           ; If CX = 0, sorting is done

    MOV SI, 0         ; Index (i = 0)
    MOV DX, CX        ; Inner loop count (n - i - 1)
INNER_LOOP:
    MOV AL, arr[SI]   ; AL = arr[i]
    MOV BL, arr[SI+1] ; BL = arr[i+1]
    CMP AL, BL
    JBE NO_SWAP       ; If arr[i] <= arr[i+1], no swap

    MOV arr[SI], BL   ; Swap arr[i] and arr[i+1]
    MOV arr[SI+1], AL

NO_SWAP:
    INC SI            ; Move to next element
    DEC DX
    JNZ INNER_LOOP    ; Repeat until inner loop finishes

    JMP OUTER_LOOP    ; Repeat outer loop

DONE:
    MOV AH, 4CH
    INT 21H

MAIN ENDP
END MAIN
IN
