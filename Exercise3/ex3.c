#include<stdio.h>

int main()
{
    char name[50];
    int age;
    
    printf("Enter your name: ");
    scanf("%s", name);
    
    printf("Enter your age: ");
    scanf("%d", &age);
    
    if(age > 60)
    {
        printf("you are too old\n");
    }
    else if(age >= 41 && age <= 60)
    {
        printf("you are old\n");
    }
    else if(age >= 21 && age <= 40)
    {
        printf("you are young\n");
    }
    else if(age < 21)
    {
        printf("you are very young\n");
    }
    
    return 0;
}
