#include<stdio.h>

int main()
{
    int opt, max, i;
    
    printf("Choose option 1 or option 2\n");
    printf("Option 1 is for ODD number and option 2 is for EVEN number\n");
    printf("Enter option: ");
    scanf("%d", &opt);
    
    if(opt == 1)
    {
        printf("Enter maximum odd number: ");
        scanf("%d", &max);
        
        for(i=1; i<=max; i=i+2)
        {
            printf("%d ", i);
        }
        printf("\n");
    }
    else if(opt == 2)
    {
        printf("Enter maximum even number: ");
        scanf("%d", &max);
        
        for(i=2; i<=max; i=i+2)
        {
            printf("%d ", i);
        }
        printf("\n");
    }
    else
    {
        printf("wrong option\n");
    }
    
    return 0;
}
