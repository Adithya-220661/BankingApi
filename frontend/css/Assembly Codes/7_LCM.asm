.model small
.stack 100h

.data
    num1 dw 12               ; First number
    num2 dw 18               ; Second number
    lcm_result dw ?          ; Store LCM result
    msg_lcm db "LCM = $"     ; Message to print LCM

.code
main proc
    ; Initialize data segment
    mov ax, @data
    mov ds, ax

    ; Find max(num1, num2) as starting LCM candidate
    mov ax, num1
    mov bx, num2
    cmp ax, bx
    jge start_lcm     ; If num1 >= num2, start with num1
    mov ax, bx        ; Else, start with num2

start_lcm:
    mov cx, ax        ; LCM candidate starts from max(num1, num2)

find_lcm:
    mov dx, 0
    mov ax, cx
    div num1          ; Check if LCM candidate is divisible by num1
    cmp dx, 0
    jne next_number

    mov ax, cx
    mov dx, 0
    div num2          ; Check if LCM candidate is divisible by num2
    cmp dx, 0
    jne next_number

    mov lcm_result, cx ; If both conditions met, LCM is found
    jmp print_result

next_number:
    add cx, 1         ; Increment candidate
    jmp find_lcm      ; Repeat check

print_result:
    ; Print "LCM = "
    mov dx, offset msg_lcm
    mov ah, 09h
    int 21h

    ; Convert and print LCM result
    mov ax, lcm_result
    call print_number

exit:
    mov ah, 4Ch
    int 21h

; -------------------------------
; Print Number (AX contains number)
; -------------------------------
print_number proc
    push ax
    push bx
    push cx
    push dx

    mov bx, 10            ; Decimal divisor
    mov cx, 0             ; Counter for digits

convert_loop:
    mov dx, 0
    div bx                ; AX = AX / 10, remainder in DX
    push dx               ; Store remainder (digit)
    inc cx                ; Increase digit count
    test ax, ax           ; Check if AX == 0
    jnz convert_loop      ; If not, continue dividing

print_digits:
    pop dx                ; Retrieve stored digit
    add dl, '0'           ; Convert to ASCII
    mov ah, 02h
    int 21h               ; Print digit
    loop print_digits     ; Print all digits

    pop dx
    pop cx
    pop bx
    pop ax
    ret
print_number endp

end main
