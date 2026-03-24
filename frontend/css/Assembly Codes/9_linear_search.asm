        .model small
.stack 100h

.data
    arr dw 2, 4, 6, 8, 10, 12, 14, 16  ; Array of elements
    len dw 8                           ; Number of elements
    target dw 10                        ; Value to search for
    found_msg db "Found!$"
    not_found_msg db "Not Found!$"

.code
main proc
    ; Initialize data segment
    mov ax, @data
    mov ds, ax

    mov cx, len     ; Set loop counter to length of array
    mov si, 0       ; SI as index (starts at 0)

linear_search:
    mov ax, arr[si] ; Load arr[SI] into AX
    cmp ax, target  ; Compare with target
    je found        ; If match found, jump to found

    add si, 2       ; Move to next element (word size)
    loop linear_search ; Repeat until CX = 0

not_found:
    mov dx, offset not_found_msg
    jmp print_message

found:
    mov dx, offset found_msg

print_message:
    mov ah, 09h     ; DOS print string function
    int 21h

exit:
    mov ah, 4Ch
    int 21h

main endp
end main