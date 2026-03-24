.MODEL SMALL
.STACK 100H

.DATA
    array DB 10, 25, 30, 45, 60, 75, 80, 95, 100, 105  ; Input array
    evenNumbers DB 10 DUP(?)  ; Array to store even numbers
    oddNumbers DB 10 DUP(?)   ; Array to store odd numbers
    length EQU 10             ; Number of elements

.CODE
MAIN PROC
    MOV AX, @DATA   ; Initialize data segment
    MOV DS, AX

    MOV CX, length  ; Loop counter (10 elements)
    MOV SI, 0       ; Index for input array
    MOV DI, 0       ; Index for evenNumbers array
    MOV BX, 0       ; Index for oddNumbers array

SEPARATE_LOOP:
    MOV AL, array[SI]  ; Load current element into AL
    TEST AL, 1         ; Check if the number is odd (bitwise AND with 1)
    JZ STORE_EVEN      ; If zero, it is even, jump to STORE_EVEN

STORE_ODD:
    MOV oddNumbers[BX], AL  ; Store in oddNumbers array
    INC BX                  ; Move to the next position in oddNumbers
    JMP CONTINUE            ; Jump to continue loop

STORE_EVEN:
    MOV evenNumbers[DI], AL ; Store in evenNumbers array
    INC DI                  ; Move to the next position in evenNumbers

CONTINUE:
    INC SI         ; Move to next element in input array
    LOOP SEPARATE_LOOP  ; Repeat until CX = 0

    MOV AH, 4CH    ; Exit program
    INT 21H

MAIN ENDP
END MAIN