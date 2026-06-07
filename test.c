#include <stdio.h>
#include <string.h>

void exercise_2() {
    char name[100];
    float basic_salary, tax, net_salary;

    printf("\n--- Exercise 2 ---\n");
    printf("Enter name: ");
    // consume any leftover newline
    getchar();
    fgets(name, sizeof(name), stdin);
    // remove newline from fgets
    name[strcspn(name, "\n")] = 0;

    printf("Enter basic salary (RM): ");
    scanf("%f", &basic_salary);

    if (basic_salary > 1000.0) {
        tax = 0.20 * basic_salary;
    } else {
        tax = 0.10 * basic_salary;
    }

    net_salary = basic_salary - tax;

    printf("\nName: %s\n", name);
    printf("Basic Salary: RM %.2f\n", basic_salary);
    printf("Tax: RM %.2f\n", tax);
    printf("Net Salary: RM %.2f\n", net_salary);
}

void exercise_3() {
    char name[100];
    int age;

    printf("\n--- Exercise 3 ---\n");
    printf("Enter name: ");
    getchar();
    fgets(name, sizeof(name), stdin);
    name[strcspn(name, "\n")] = 0;

    printf("Enter age: ");
    scanf("%d", &age);

    if (age > 60) {
        printf("you are too old\n");
    } else if (age >= 41 && age <= 60) {
        printf("you are old\n");
    } else if (age >= 21 && age <= 40) {
        printf("you are young\n");
    } else {
        printf("you are very young\n");
    }
}

void exercise_4() {
    int option, max_num;

    printf("\n--- Exercise 4 ---\n");
    printf("Choose option 1 or option 2\n");
    printf("Option 1 is for ODD number\n");
    printf("Option 2 is for EVEN number\n");
    printf("Choice: ");
    scanf("%d", &option);

    if (option == 1) {
        printf("Enter the maximum odd number you want to list: ");
        scanf("%d", &max_num);
        for (int i = 1; i <= max_num; i += 2) {
            printf("%d ", i);
        }
        printf("\n");
    } else if (option == 2) {
        printf("Enter the maximum even number you want to list: ");
        scanf("%d", &max_num);
        for (int i = 2; i <= max_num; i += 2) {
            printf("%d ", i);
        }
        printf("\n");
    } else {
        printf("Invalid option.\n");
    }
}

int main() {
    int choice;

    do {
        printf("\n============================\n");
        printf("        EXERCISES           \n");
        printf("============================\n");
        printf("2. Exercise 2\n");
        printf("3. Exercise 3\n");
        printf("4. Exercise 4\n");
        printf("0. Exit\n");
        printf("Enter your choice: ");
        scanf("%d", &choice);

        switch (choice) {
            case 2:
                exercise_2();
                break;
            case 3:
                exercise_3();
                break;
            case 4:
                exercise_4();
                break;
            case 0:
                printf("Exiting...\n");
                break;
            default:
                printf("Invalid choice. Please try again.\n");
        }
    } while (choice != 0);

    return 0;
}
