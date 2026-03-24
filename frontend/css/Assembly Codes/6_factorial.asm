.model small
.stack 100h

.data
    num dw 6           ; Number to find factorial of (change as needed)
    result dw 1        ; Store the factorial result

.code
main proc
    mov ax, @data      ; Initialize data segment
    mov ds, ax         

    mov cx, num        ; Load num into CX (loop counter)
    mov ax, 1          ; AX = 1 (initialize factorial)

factorial_loop:
    mul cx             ; AX = AX * CX (Multiply current factorial value)
    loop factorial_loop ; Decrement CX and loop if CX > 0

    mov result, ax     ; Store result in memory

    mov ah, 4Ch        ; DOS interrupt to exit
    int 21h

main endp
end main
