#include<stdio.h>

int main()
{
    char name[50];
    float salary, tax, net_salary;
    
    printf("Enter name: ");
    scanf("%s", name);
    
    printf("Enter basic salary: ");
    scanf("%f", &salary);
    
    if(salary > 1000)
    {
        tax = (20.0/100) * salary;
    }
    else
    {
        tax = (10.0/100) * salary;
    }
    
    net_salary = salary - tax;
    
    printf("Name: %s\n", name);
    printf("Basic Salary: %f\n", salary);
    printf("Tax: %f\n", tax);
    printf("Net Salary: %f\n", net_salary);
    
    return 0;
}
