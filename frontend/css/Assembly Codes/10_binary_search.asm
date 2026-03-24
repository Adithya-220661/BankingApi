.model small
.stack 100h

.data
    arr dw 2, 4, 6, 8, 10, 12, 14, 16  ; Sorted array
    len dw 8                           ; Number of elements
    target dw 10                        ; Value to search for
    found_msg db "Found!$"
    not_found_msg db "Not Found!$"

.code
main proc
    ; Initialize data segment
    mov ax, @data
    mov ds, ax

    ; Initialize left = 0, right = len - 1
    mov cx, 0              ; left = 0
    mov dx, len
    dec dx                 ; right = len - 1

binary_search:
    cmp cx, dx
    jg not_found           ; If left > right, target not found

    mov ax, cx
    add ax, dx
    shr ax, 1              ; mid = (left + right) / 2

    mov bx, ax
    shl bx, 1              ; bx = mid * 2 (word size elements)
    mov si, bx
    mov bx, arr[si]        ; Load arr[mid] into BX

    cmp bx, target
    je found               ; If arr[mid] == target, found

    jl search_right        ; If arr[mid] < target, move right
    dec ax                 ; right = mid - 1
    mov dx, ax
    jmp binary_search

search_right:
    inc ax                 ; left = mid + 1
    mov cx, ax
    jmp binary_search

found:
    mov dx, offset found_msg
    jmp print_message

not_found:
    mov dx, offset not_found_msg

print_message:
    mov ah, 09h            ; DOS print string function
    int 21h

exit:
    mov ah, 4Ch
    int 21h

main endp
end main