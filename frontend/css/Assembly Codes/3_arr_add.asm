      .MODEL SMALL
.STACK 100H

.DATA
    array1 DB 10, 20, 30, 40, 50   ; First array
    array2 DB  5, 15, 25, 35, 45   ; Second array
    result DB  5 DUP(?)            ; Result array (stores sum)
    length EQU 5                   ; Number of elements

.CODE
MAIN PROC
    MOV AX, @DATA     ; Initialize data segment
    MOV DS, AX
    MOV ES, AX        ; Extra segment for result (not required but for clarity)

    MOV CX, length    ; Loop counter (5 elements)
    MOV SI, 0         ; Index for array1
    MOV DI, 0         ; Index for result array

ADD_LOOP:
    MOV AL, array1[SI]  ; Load element from array1
    ADD AL, array2[SI]  ; Add element from array2
    MOV result[DI], AL  ; Store sum in result array

    INC SI              ; Move to next index
    INC DI              ; Move result index
    LOOP ADD_LOOP       ; Repeat until CX = 0

    MOV AH, 4CH         ; Exit program
    INT 21H

MAIN ENDP
END MAIN
